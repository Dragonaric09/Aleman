#!/usr/bin/env sh
# Restaura una copia creada con backup.sh: scripts/restore.sh backups/deutsch_AAAA-MM-DD_HHMM.sql.gz
set -eu
cd "$(dirname "$0")/.."
[ $# -eq 1 ] || { echo "Uso: $0 <archivo.sql.gz>"; exit 1; }
[ -f "$1" ] || { echo "No existe: $1"; exit 1; }
[ -f .env ] && set -a && . ./.env && set +a
printf "Esto sobrescribe la base de datos «%s». Escribe RESTAURAR para continuar: " "$POSTGRES_DB"
read -r answer
[ "$answer" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }
gunzip -c "$1" | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
echo "Restauración terminada."
