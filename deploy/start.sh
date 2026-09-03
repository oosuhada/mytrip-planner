#!/bin/zsh
set -euo pipefail

ROOT="${MYTRIP_ROOT:-/Users/gabrieljang/Services/mytrip-planner}"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  source "$ROOT/.env"
  set +a
fi

# Optional secret indirection for hosts that already keep an OpenAI key in
# another server-only env file. The key itself never needs to be copied into
# this repository or MyTrip's .env.
if [[ -z "${OPENAI_API_KEY:-}" && -n "${OPENAI_KEY_FILE:-}" && -f "$OPENAI_KEY_FILE" ]]; then
  export OPENAI_API_KEY="$(grep -m1 '^OPENAI_API_KEY=' "$OPENAI_KEY_FILE" | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
fi

export NODE_ENV=production
export PORT="${PORT:-8290}"
export DATA_DIR="${DATA_DIR:-$ROOT/data}"

exec /opt/homebrew/opt/node@22/bin/node "$ROOT/dist-server/index.mjs"
