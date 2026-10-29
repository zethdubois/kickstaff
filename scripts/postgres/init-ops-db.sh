#!/bin/bash
# Second database on this Postgres instance. Path suffix = database name.
# Runs only when the data volume is first created.
set -euo pipefail
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
SELECT 'CREATE DATABASE kickagent_ops_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kickagent_ops_dev')\gexec
SQL
