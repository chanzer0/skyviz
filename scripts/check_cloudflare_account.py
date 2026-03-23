from __future__ import annotations

import argparse
import os
import re
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKER_CONFIG = REPO_ROOT / 'workers' / 'completionist-live' / 'wrangler.jsonc'
EXPECTED_EMAIL = 'seansailer28@gmail.com'
EXPECTED_ACCOUNT_ID = '172da47da00e3b33810d2e9c73c9a0b9'
NPX_COMMAND = 'npx.cmd' if os.name == 'nt' else 'npx'


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Verify Wrangler auth and repository config are pinned to the expected Cloudflare account.',
    )
    parser.add_argument(
        '--config',
        default=str(DEFAULT_WORKER_CONFIG),
        help='Path to the Wrangler config file to validate.',
    )
    parser.add_argument(
        '--expected-email',
        default=EXPECTED_EMAIL,
        help='Expected Cloudflare email.',
    )
    parser.add_argument(
        '--expected-account-id',
        default=EXPECTED_ACCOUNT_ID,
        help='Expected Cloudflare account id.',
    )
    return parser.parse_args()


def read_config_account_id(config_path: Path) -> str:
    text = config_path.read_text(encoding='utf-8')
    match = re.search(r'"account_id"\s*:\s*"([^"]+)"', text)
    if not match:
        raise SystemExit(f'check_cloudflare_account: {config_path} is missing account_id')
    return match.group(1).strip()


def run_wrangler_whoami(config_path: Path) -> str:
    result = subprocess.run(
        [
            NPX_COMMAND,
            'wrangler',
            'whoami',
            '--config',
            str(config_path),
        ],
        cwd=config_path.parent,
        check=False,
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace',
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        stdout = result.stdout.strip()
        detail = stderr or stdout or f'exit code {result.returncode}'
        raise SystemExit(f'check_cloudflare_account: wrangler whoami failed: {detail}')
    return result.stdout


def parse_wrangler_email(whoami_output: str) -> str:
    match = re.search(r'email\s+([^\s.]+@[^\s.]+\.[^\s.]+)', whoami_output, flags=re.IGNORECASE)
    if not match:
        raise SystemExit('check_cloudflare_account: failed to parse email from wrangler whoami output')
    return match.group(1).strip().lower()


def parse_wrangler_accounts(whoami_output: str) -> list[dict[str, str]]:
    accounts = []
    for line in whoami_output.splitlines():
        if '│' not in line:
            continue
        cells = [cell.strip() for cell in line.split('│')[1:-1]]
        if len(cells) != 2:
            continue
        account_name, account_id = cells
        if account_id.lower() == 'account id' or not account_id:
            continue
        if re.fullmatch(r'[0-9a-f]{32}', account_id, flags=re.IGNORECASE):
            accounts.append({
                'name': account_name,
                'id': account_id,
            })
    if not accounts:
        raise SystemExit('check_cloudflare_account: failed to parse account table from wrangler whoami output')
    return accounts


def main() -> int:
    args = parse_args()
    config_path = Path(args.config).resolve()
    if not config_path.exists():
        raise SystemExit(f'check_cloudflare_account: config not found: {config_path}')

    config_account_id = read_config_account_id(config_path)
    if config_account_id != args.expected_account_id:
        raise SystemExit(
            'check_cloudflare_account: wrangler config account_id mismatch: '
            f'expected {args.expected_account_id}, got {config_account_id}',
        )

    whoami_output = run_wrangler_whoami(config_path)
    email = parse_wrangler_email(whoami_output)
    if email != args.expected_email.lower():
        raise SystemExit(
            'check_cloudflare_account: Wrangler auth email mismatch: '
            f'expected {args.expected_email}, got {email or "unknown"}',
        )

    accounts = parse_wrangler_accounts(whoami_output)
    matched_account = next(
        (
            account for account in accounts
            if str(account.get('id') or '').strip() == args.expected_account_id
        ),
        None,
    )
    if matched_account is None:
        raise SystemExit(
            'check_cloudflare_account: expected account id not present in Wrangler memberships: '
            f'{args.expected_account_id}',
        )

    print(
        'check_cloudflare_account: ok',
        f'email={email}',
        f'account_id={args.expected_account_id}',
        f'account_name={str(matched_account.get("name") or "").strip() or "unknown"}',
        f'config={config_path.relative_to(REPO_ROOT)}',
    )
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
