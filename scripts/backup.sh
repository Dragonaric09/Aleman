#!/usr/bin/env sh
# Copia de seguridad de la base de datos -> backups/deutsch_AAAA-MM-DD_HHMM.sql.gz
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
mkdir -p backups
file="backups/deutsch_$(date +%F_%H%M).sql.gz"
docker compose exec -T db pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$file"
echo "Copia guardada en $file"
