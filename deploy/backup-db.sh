#!/bin/bash
# Copies data.sqlite into ./backups with a timestamp and prunes anything
# older than 30 days. Run from the project root (or set APP_DIR below),
# on a cron schedule — see deploy/README or DEPLOY.md for the crontab line.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_FILE="$APP_DIR/data.sqlite"
BACKUP_DIR="$APP_DIR/backups"
RETENTION_DAYS=30

if [ ! -f "$DB_FILE" ]; then
  echo "No database found at $DB_FILE — nothing to back up." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
cp "$DB_FILE" "$BACKUP_DIR/data-$TIMESTAMP.sqlite"

find "$BACKUP_DIR" -name "data-*.sqlite" -mtime "+$RETENTION_DAYS" -delete

echo "Backed up to $BACKUP_DIR/data-$TIMESTAMP.sqlite"
