#!/usr/bin/env bash
# Safe one-shot publish: backup FIRST, then pull + FE build + backend (Flyway V20-V23).
# Run on VPS as root from anywhere:
#   bash /opt/millionairehub/deploy-one-shot.sh
# Or paste this whole file contents into the Hostinger web terminal.
set -euo pipefail
cd /opt/millionairehub

echo "== 1/4 DB backup (data safety) =="
bash ./backup.sh
LATEST=$(ls -1t /opt/backups/mh_*.sql.gz.enc 2>/dev/null | head -1 || true)
if [ -z "${LATEST}" ]; then
  echo "BACKUP FAILED: no encrypted dump found. STOPPING. No migrate/deploy."
  exit 1
fi
ls -lh "$LATEST"
echo "Backup OK: $LATEST"

echo "== 2/4 git pull =="
git fetch origin
git checkout main
git pull --ff-only origin main

echo "== 3/4 frontend build =="
cd colorwin-frontend
npm ci
npm run build
cd ..

echo "== 4/4 backend rebuild (Flyway applies V20-V23) =="
docker compose build backend
docker compose up -d backend
sleep 8
docker compose ps
curl -fsS http://127.0.0.1:8080/api/health || true
echo
curl -fsS http://127.0.0.1:8080/api/spins/segments | head -c 500 || true
echo
echo "DONE. If health UP and segments show multipliers, smoke Color bet + XpinR spin in browser."
