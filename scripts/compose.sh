#!/usr/bin/env bash
# Run docker compose (v2 plugin), docker-compose (v1), or plain docker for db:up / db:down.
set -euo pipefail

CONTAINER_NAME=publicweb-postgres
VOLUME_NAME=publicweb_pg_data

run_compose() {
	if docker compose version &>/dev/null 2>&1; then
		exec docker compose "$@"
	fi
	if command -v docker-compose &>/dev/null; then
		exec docker-compose "$@"
	fi
	return 1
}

docker_up_standalone() {
	if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
		if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
			echo "Postgres already running ($CONTAINER_NAME)"
			return 0
		fi
		docker start "$CONTAINER_NAME"
		echo "Started $CONTAINER_NAME"
		return 0
	fi

	docker volume create "$VOLUME_NAME" >/dev/null 2>&1 || true
	docker run -d \
		--name "$CONTAINER_NAME" \
		--restart unless-stopped \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=publicweb_dev \
		-p 5043:5432 \
		-v "${VOLUME_NAME}:/var/lib/postgresql/data" \
		postgres:16
	echo "Created and started $CONTAINER_NAME (docker run; matches docker-compose.yml)"
}

docker_down_standalone() {
	if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
		docker stop "$CONTAINER_NAME"
		echo "Stopped $CONTAINER_NAME"
	else
		echo "Container $CONTAINER_NAME is not running"
	fi
}

# Prefer Compose when installed.
if run_compose version &>/dev/null 2>&1; then
	if docker compose version &>/dev/null 2>&1; then
		exec docker compose "$@"
	else
		exec docker-compose "$@"
	fi
fi

# Fallback: only db:up / db:down equivalents (no Compose plugin required).
case "${1:-}" in
	up)
		if [[ "${2:-}" == "-d" ]]; then
			docker_up_standalone
			exit 0
		fi
		;;
	down)
		docker_down_standalone
		exit 0
		;;
esac

echo "Docker Compose is not installed." >&2
echo "" >&2
echo "For db:up / db:down only, plain docker is supported (re-run pnpm db:up)." >&2
echo "" >&2
echo "To install Compose (optional):" >&2
echo "  sudo apt update && sudo apt install docker-compose-v2" >&2
echo "  # or: sudo apt install docker-compose" >&2
exit 1
