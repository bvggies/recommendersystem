#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PSQL="${PSQL:-$(command -v psql || true)}"

if [[ -z "$PSQL" && -x /opt/homebrew/opt/libpq/bin/psql ]]; then
  PSQL="/opt/homebrew/opt/libpq/bin/psql"
fi

if [[ -z "$PSQL" ]]; then
  echo "psql not found. Install with: brew install libpq" >&2
  echo "Then add to PATH: export PATH=\"/opt/homebrew/opt/libpq/bin:\$PATH\"" >&2
  exit 1
fi

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Add it to server/.env" >&2
  exit 1
fi

for file in "$ROOT_DIR"/db/migrations/*.sql; do
  echo "Running $(basename "$file")..."
  "$PSQL" "$DATABASE_URL" -f "$file"
done

echo "Migrations complete."
