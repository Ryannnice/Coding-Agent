#!/bin/bash
WORKSPACE="${WORKSPACE:-/workspace}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-9000}"

cd "$WORKSPACE"
npx vite preview --host "$HOST" --port "$PORT" --strictPort
