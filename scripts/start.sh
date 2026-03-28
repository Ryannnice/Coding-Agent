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

python3 -m uvicorn app:app --host "$HOST" --port "$PORT"
