from __future__ import annotations

import argparse
import posixpath
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote


REPO_ROOT = Path(__file__).resolve().parents[1]
SITE_ROOT = REPO_ROOT / 'site'
DEFAULT_HOST = '127.0.0.1'
DEFAULT_PORT = 4173


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
    parser.add_argument('--host', default=DEFAULT_HOST, help=f'Bind host (default: {DEFAULT_HOST}).')
    parser.add_argument('--port', type=int, default=DEFAULT_PORT, help=f'Bind port (default: {DEFAULT_PORT}).')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    server = ThreadingHTTPServer((args.host, args.port), LocalPreviewRequestHandler)
    server.daemon_threads = True
    host_label = 'localhost' if args.host in {'127.0.0.1', '0.0.0.0'} else args.host
    fixture_path = REPO_ROOT / 'skycards_user.json'
    print(f'Local preview: http://{host_label}:{args.port}/')
    print(f'Real-data preview: http://{host_label}:{args.port}/?devLoad=skycards_user')
    print(f'Repo-root fixture: {fixture_path}')
    if not fixture_path.exists():
        print('Fixture missing. Refresh it locally with: python scripts/export_skycards_user.py --export-now')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down local preview server...')
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
