from __future__ import annotations

import argparse
import errno
import posixpath
import socket
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote
from urllib.request import ProxyHandler, build_opener


REPO_ROOT = Path(__file__).resolve().parents[1]
SITE_ROOT = REPO_ROOT / 'site'
DEFAULT_HOST = 'localhost'
DEFAULT_PORT = 4173
PROBE_TIMEOUT_SECONDS = 3
PROBE_STARTUP_ATTEMPTS = 10
PROBE_RETRY_DELAY_SECONDS = 0.2
OPTIONAL_IPV6_ERRNOS = {
    getattr(errno, 'EAFNOSUPPORT', -1),
    getattr(errno, 'EADDRNOTAVAIL', -1),
    10047,  # WSAEAFNOSUPPORT
    10049,  # WSAEADDRNOTAVAIL
}
NO_PROXY_OPENER = build_opener(ProxyHandler({}))


class PreviewThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


class PreviewThreadingHTTPServerV6(PreviewThreadingHTTPServer):
    address_family = socket.AF_INET6


class LocalPreviewRequestHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        relative_url = path.split('?', 1)[0].split('#', 1)[0]
        normalized = posixpath.normpath(unquote(relative_url))
        parts = [part for part in normalized.split('/') if part and part not in {'.', '..'}]
        candidates = [SITE_ROOT / 'index.html'] if not parts else [SITE_ROOT.joinpath(*parts), REPO_ROOT.joinpath(*parts)]

        for candidate in candidates:
            try:
                candidate.relative_to(REPO_ROOT)
            except ValueError:
                continue
            if candidate.exists():
                return str(candidate)

        return str(SITE_ROOT / 'index.html') if not parts else str(SITE_ROOT.joinpath(*parts))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Serve the local Skyviz preview from site/ while exposing the repo-root skycards_user.json fixture.',
    )
    parser.add_argument(
        '--host',
        default=DEFAULT_HOST,
        help=f'Bind host (default: {DEFAULT_HOST}; default loopback mode binds both 127.0.0.1 and ::1 so localhost works in browsers and Playwright).',
    )
    parser.add_argument('--port', type=int, default=DEFAULT_PORT, help=f'Bind port (default: {DEFAULT_PORT}).')
    return parser.parse_args()


def build_bind_targets(host: str) -> list[tuple[str, type[PreviewThreadingHTTPServer]]]:
    normalized = host.strip().lower()
    if normalized == 'localhost':
        return [
            ('127.0.0.1', PreviewThreadingHTTPServer),
            ('::1', PreviewThreadingHTTPServerV6),
        ]
    if normalized == '::1':
        return [('::1', PreviewThreadingHTTPServerV6)]
    return [(host, PreviewThreadingHTTPServer)]


def build_preview_urls(host: str, port: int) -> tuple[str, list[str]]:
    normalized = host.strip().lower()
    if normalized == 'localhost':
        return f'http://localhost:{port}/', [f'http://127.0.0.1:{port}/', f'http://[::1]:{port}/']
    if normalized == '127.0.0.1':
        return f'http://127.0.0.1:{port}/', []
    if normalized == '::1':
        return f'http://[::1]:{port}/', []
    if host == '0.0.0.0':
        return f'http://localhost:{port}/', [f'http://127.0.0.1:{port}/']
    return f'http://{host}:{port}/', []


def is_optional_ipv6_bind_error(error: OSError) -> bool:
    return error.errno in OPTIONAL_IPV6_ERRNOS


def probe_expected_paths() -> list[tuple[str, str]]:
    return [
        ('/', 'text/html'),
        ('/styles.css', 'text/css'),
        ('/src/main.js', 'javascript'),
    ]


def join_url(base_url: str, path: str) -> str:
    return f'{base_url.rstrip("/")}{path}'


def probe_url(url: str, expected_content_type: str) -> str | None:
    try:
        with NO_PROXY_OPENER.open(url, timeout=PROBE_TIMEOUT_SECONDS) as response:
            content_type = response.headers.get_content_type()
            if response.status != 200:
                return f'{url} returned HTTP {response.status}'
            if expected_content_type not in content_type:
                return f'{url} returned unexpected content type {content_type!r}'
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        return f'{url} failed: {error}'
    return None


def probe_preview_urls(preview_url: str, alias_urls: list[str]) -> str | None:
    preview_paths = probe_expected_paths()
    urls_to_probe = [preview_url, *alias_urls]
    for _ in range(PROBE_STARTUP_ATTEMPTS):
        failures: list[str] = []
        for url in urls_to_probe:
            path_checks = preview_paths if url == preview_url else preview_paths[:1]
            for path, expected_content_type in path_checks:
                failure = probe_url(join_url(url, path), expected_content_type)
                if failure:
                    failures.append(failure)
                    break
        if not failures:
            return None
        time.sleep(PROBE_RETRY_DELAY_SECONDS)
    return failures[0]


def main() -> int:
    args = parse_args()
    servers: list[PreviewThreadingHTTPServer] = []
    bound_hosts: list[str] = []
    for bind_host, server_class in build_bind_targets(args.host):
        try:
            server = server_class((bind_host, args.port), LocalPreviewRequestHandler)
        except OSError as error:
            if args.host.strip().lower() == 'localhost' and bind_host == '::1' and is_optional_ipv6_bind_error(error):
                print(
                    f'Skipping IPv6 loopback bind for ::1:{args.port}: {error}. '
                    'Local preview will continue on IPv4 loopback only.',
                    flush=True,
                )
                continue
            for started_server in servers:
                started_server.server_close()
            print(
                f'Failed to bind {bind_host}:{args.port} for local preview: {error}. '
                f'Stop the conflicting process or choose another port with --port.',
                file=sys.stderr,
                flush=True,
            )
            return 1
        server.daemon_threads = True
        servers.append(server)
        bound_hosts.append(bind_host)

    effective_host = args.host
    if args.host.strip().lower() == 'localhost' and '::1' not in bound_hosts:
        effective_host = '127.0.0.1'
    preview_url, alias_urls = build_preview_urls(effective_host, args.port)
    fixture_path = REPO_ROOT / 'skycards_user.json'
    try:
        for server in servers:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
        probe_failure = probe_preview_urls(preview_url, alias_urls)
        if probe_failure:
            print(
                'Local preview failed its startup reachability check. '
                f'{probe_failure}. Another process may already be handling part of port {args.port} loopback traffic. '
                'Stop the conflicting process or choose another port with --port.',
                file=sys.stderr,
                flush=True,
            )
            return 1
        print(f'Local preview: {preview_url}', flush=True)
        for alias_url in alias_urls:
            print(f'Loopback alias: {alias_url}', flush=True)
        print(f'Real-data preview: {preview_url}?devLoad=skycards_user', flush=True)
        print(f'Repo-root fixture: {fixture_path}', flush=True)
        if args.host == '127.0.0.1':
            print('Note: browsers on this Windows setup may fail against http://localhost when the server is bound only to 127.0.0.1.', flush=True)
        if not fixture_path.exists():
            print('Fixture missing. Refresh it locally with: python scripts/export_skycards_user.py --export-now', flush=True)
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        print('\nShutting down local preview server...', flush=True)
    finally:
        for server in servers:
            server.shutdown()
        for server in servers:
            server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
