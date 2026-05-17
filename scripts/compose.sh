#!/usr/bin/env bash
# Run docker compose (v2 plugin) or docker-compose (v1). Used by pnpm db:up / db:down.
set -euo pipefail

if docker compose version &>/dev/null 2>&1; then
	exec docker compose "$@"
fi

if command -v docker-compose &>/dev/null; then
	exec docker-compose "$@"
fi

echo "Docker Compose is not installed." >&2
echo "" >&2
echo "Ubuntu/Debian (Compose v2 plugin, recommended):" >&2
echo "  sudo apt update && sudo apt install docker-compose-v2" >&2
echo "" >&2
echo "Or standalone v1:" >&2
echo "  sudo apt install docker-compose" >&2
echo "" >&2
echo "Then re-run: pnpm db:up" >&2
exit 1
