from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Mapping, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = '.env.skycards.local'
DEFAULT_API_URL = 'https://api.skycards.oldapes.com/users/'
DEFAULT_CLIENT_VERSION = '2.0.27'
DEFAULT_OUTPUT_PATH = 'skycards_user.json'
DEFAULT_ARCHIVE_DIR = 'output/skycards-user-exports'
DEFAULT_ARCHIVE_PREFIX = 'skycards_user'
USER_AGENT = 'okhttp/4.12.0'


class ConfigError(RuntimeError):
    """Raised when the local env file is missing or incomplete."""


class ExportError(RuntimeError):
    """Raised when the API request or export write fails."""


@dataclass(frozen=True)
class AppConfig:
    env_file: Path
    email: str
    password: str
    api_url: str
    client_version: str
    output_path: Path
    archive_dir: Path
    archive_prefix: str


def resolve_repo_path(raw_path: str) -> Path:
    path = Path(raw_path)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def parse_env_file(path: Path) -> Dict[str, str]:
    if not path.exists():
        raise ConfigError(
            f'Missing env file: {path}. Copy .env.skycards.local.example to .env.skycards.local first.'
        )

    values: Dict[str, str] = {}
    for line_number, raw_line in enumerate(path.read_text(encoding='utf-8').splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' not in line:
            raise ConfigError(f'Invalid line {line_number} in {path}: expected KEY=VALUE.')
        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip()
        if not key:
            raise ConfigError(f'Invalid line {line_number} in {path}: missing key name.')
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[key] = value
    return values


def load_config(env_file: Path) -> AppConfig:
    env_path = resolve_repo_path(str(env_file))
    values = parse_env_file(env_path)

    email = values.get('SKYCARDS_EMAIL', '').strip()
    password = values.get('SKYCARDS_PASSWORD', '').strip()
    if not email or not password:
        raise ConfigError(f'{env_path} must define both SKYCARDS_EMAIL and SKYCARDS_PASSWORD.')

    api_url = values.get('SKYCARDS_API_URL', DEFAULT_API_URL).strip() or DEFAULT_API_URL
    client_version = (
        values.get('SKYCARDS_CLIENT_VERSION', DEFAULT_CLIENT_VERSION).strip() or DEFAULT_CLIENT_VERSION
    )
    output_path = resolve_repo_path(values.get('SKYCARDS_OUTPUT_PATH', DEFAULT_OUTPUT_PATH).strip() or DEFAULT_OUTPUT_PATH)
    archive_dir = resolve_repo_path(values.get('SKYCARDS_ARCHIVE_DIR', DEFAULT_ARCHIVE_DIR).strip() or DEFAULT_ARCHIVE_DIR)
    archive_prefix = values.get('SKYCARDS_ARCHIVE_PREFIX', DEFAULT_ARCHIVE_PREFIX).strip() or DEFAULT_ARCHIVE_PREFIX

    return AppConfig(
        env_file=env_path,
        email=email,
        password=password,
        api_url=api_url,
        client_version=client_version,
        output_path=output_path,
        archive_dir=archive_dir,
        archive_prefix=archive_prefix,
    )


def try_load_config(env_file: Path) -> Tuple[Optional[AppConfig], Optional[str]]:
    try:
        return load_config(env_file), None
    except ConfigError as exc:
        return None, str(exc)


def mask_email(email: str) -> str:
    if '@' not in email:
        if len(email) <= 2:
            return '*' * len(email)
        return f'{email[0]}{"*" * (len(email) - 2)}{email[-1]}'
    local_part, domain = email.split('@', 1)
    if len(local_part) <= 2:
        masked_local = '*' * len(local_part)
    else:
        masked_local = f'{local_part[0]}{"*" * (len(local_part) - 2)}{local_part[-1]}'
    return f'{masked_local}@{domain}'


def count_rows(value: object) -> int:
    return len(value) if isinstance(value, list) else 0


def summarize_user_data(user_data: Mapping[str, object]) -> str:
    user_name = str(user_data.get('name') or 'Unknown user')
    cards = count_rows(user_data.get('cards'))
    airports = count_rows(user_data.get('unlockedAirportIds'))
    caught_registrations = user_data.get('caughtRegistrations')
    unique_regs = user_data.get('uniqueRegs')
    if isinstance(caught_registrations, list):
        regs = len(caught_registrations)
    elif isinstance(unique_regs, list):
        regs = len(unique_regs)
    else:
        regs = 0
    return f'User: {user_name}\nCards: {cards}\nUnlocked airports: {airports}\nRegistration rows: {regs}'


def render_home(env_file: Path, config: Optional[AppConfig], config_error: Optional[str], status: str) -> None:
    print('\nSkyviz Local Skycards Export')
    print('==========================')
    print('Private local fixture refresh for the ignored repo-root skycards_user.json file.')
    print(f'Env file: {resolve_repo_path(str(env_file))}')
    if config:
        print(f'Email: {mask_email(config.email)}')
        print(f'Latest fixture: {config.output_path}')
        print(f'Archive directory: {config.archive_dir}')
        print(f'Client version: {config.client_version}')
        print('Payload: full response.userData object')
    else:
        print('Config: not loaded')
    if config_error:
        print(f'Config error: {config_error}')
    print('\n[E] Export fixture')
    print('[R] Reload config')
    print('[Q] Quit')
    print('\nStatus:')
    print(status)


def decode_response_body(raw_bytes: bytes) -> str:
    try:
        return raw_bytes.decode('utf-8')
    except UnicodeDecodeError:
        return raw_bytes.decode('utf-8', errors='replace')


def fetch_user_data(config: AppConfig) -> Mapping[str, object]:
    request_body = json.dumps(
        {'email': config.email, 'password': config.password},
        separators=(',', ':'),
    ).encode('utf-8')
    request = Request(
        config.api_url,
        data=request_body,
        method='POST',
        headers={
            'accept': 'application/json',
            'content-type': 'application/json',
            'user-agent': USER_AGENT,
            'x-client-version': config.client_version,
        },
    )

    response_text: Optional[str] = None
    try:
        with urlopen(request, timeout=30) as response:
            response_text = decode_response_body(response.read())
    except HTTPError as exc:
        response_text = decode_response_body(exc.read())
    except URLError as exc:
        raise ExportError(f'Failed to connect to the Skycards API: {exc.reason}') from exc

    if response_text is None:
        raise ExportError('The Skycards API returned an empty response.')

    try:
        payload = json.loads(response_text)
    except json.JSONDecodeError as exc:
        raise ExportError('Failed to parse the Skycards API response as JSON.') from exc

    if not isinstance(payload, dict):
        raise ExportError('Unexpected Skycards API response shape.')

    api_error = payload.get('error') or payload.get('message')
    if api_error:
        raise ExportError(f'API Error: {api_error}')

    user_data = payload.get('userData')
    if not isinstance(user_data, dict):
        raise ExportError('Skycards API response did not include a full userData object.')
    return user_data


def atomic_write_text(target: Path, text: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    temp_path = target.with_name(f'{target.name}.tmp')
    temp_path.write_text(text, encoding='utf-8', newline='\n')
    temp_path.replace(target)


def write_user_data(config: AppConfig, user_data: Mapping[str, object]) -> Tuple[Path, Path]:
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    archive_path = config.archive_dir / f'{config.archive_prefix}_{timestamp}.json'
    json_text = json.dumps(user_data, ensure_ascii=False, indent=2) + '\n'
    atomic_write_text(config.output_path, json_text)
    atomic_write_text(archive_path, json_text)
    return config.output_path, archive_path


def export_user_data(config: AppConfig) -> str:
    user_data = fetch_user_data(config)
    latest_path, archive_path = write_user_data(config, user_data)
    return '\n'.join(
        [
            'Export complete.',
            summarize_user_data(user_data),
            f'Latest fixture: {latest_path}',
            f'Archive copy: {archive_path}',
        ]
    )


def pause() -> None:
    input('\nPress Enter to continue...')


def run_tui(env_file: Path) -> int:
    status = 'Press E to export the full Skycards userData payload into the repo-root fixture.'

    while True:
        config, config_error = try_load_config(env_file)
        render_home(env_file, config, config_error, status)
        choice = input('\nSelect an option: ').strip().lower()

        if choice in {'q', 'quit'}:
            return 0

        if choice in {'r', 'reload'}:
            status = f'Reloaded config from {resolve_repo_path(str(env_file))}.'
            continue

        if choice in {'', 'e', 'export'}:
            if config_error or not config:
                status = config_error or 'Config could not be loaded.'
                pause()
                continue
            try:
                status = export_user_data(config)
            except ExportError as exc:
                status = str(exc)
            pause()
            continue

        status = 'Unknown option. Use E, R, or Q.'


def format_config_summary(config: AppConfig) -> str:
    return '\n'.join(
        [
            f'Env file: {config.env_file}',
            f'Email: {mask_email(config.email)}',
            f'API URL: {config.api_url}',
            f'Client version: {config.client_version}',
            f'Latest fixture: {config.output_path}',
            f'Archive directory: {config.archive_dir}',
            'Payload: full response.userData object',
        ]
    )


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Refresh the ignored repo-root skycards_user.json fixture from the live Skycards login endpoint.'
    )
    parser.add_argument(
        '--env-file',
        default=DEFAULT_ENV_FILE,
        help='Path to the local env file. Relative paths resolve from the repository root.',
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--show-config', action='store_true', help='Load the env file, print a masked config summary, and exit.')
    mode.add_argument('--export-now', action='store_true', help='Skip the menu and export immediately.')
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    env_file = Path(args.env_file)

    try:
        if args.show_config:
            print(format_config_summary(load_config(env_file)))
            return 0

        if args.export_now:
            print(export_user_data(load_config(env_file)))
            return 0

        if not sys.stdin.isatty() or not sys.stdout.isatty():
            print('Interactive mode requires a TTY. Use --show-config or --export-now instead.', file=sys.stderr)
            return 1

        return run_tui(env_file)
    except ConfigError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except ExportError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print('\nCancelled.')
        return 130


if __name__ == '__main__':
    raise SystemExit(main())
