#!/bin/bash
set -e
cd /opt/millionairehub
set -a; . ./.env; set +a
F="/opt/backups/mh_$(date +%F_%H%M).sql.gz"
docker compose exec -T db pg_dump -U "$DB_USERNAME" -d "$DB_NAME" | gzip > "$F"
chmod 600 "$F"
openssl enc -aes-256-cbc -pbkdf2 -salt -pass file:/root/.mh_backup_pass -in "$F" -out "$F.enc"
chmod 600 "$F.enc"
rclone copy "$F.enc" gdrive:mh-backups
find /opt/backups -name 'mh_*' -mtime +14 -delete
rclone delete gdrive:mh-backups --min-age 30d
echo "$(date) backup ok + drive upload: $F.enc"
