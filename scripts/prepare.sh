#!/bin/bash
set -euo pipefail

WORKSPACE="${WORKSPACE:-/workspace}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-9000}"

if [ ! -d "$WORKSPACE" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  WORKSPACE="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

cd "$WORKSPACE"

python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required to run the internal opencode server." >&2
  exit 1
fi

bun install --frozen-lockfile
