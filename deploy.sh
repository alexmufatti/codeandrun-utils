#!/bin/bash
set -euo pipefail

# ── Configurazione ──────────────────────────────────────────────────────────
SERVER_USER="user"
SERVER_HOST="your-server-ip"
SERVER_DIR="/opt/codeandrun"   # cartella sul server con .env.local e docker-compose.yml
IMAGE_NAME="codeandrun-web"
IMAGE_TAG="latest"
# ────────────────────────────────────────────────────────────────────────────

IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

echo "▶ Build immagine Docker: ${IMAGE}"
docker build --platform linux/amd64 -t "${IMAGE}" .

echo "▶ Trasferimento immagine al server ${SERVER_HOST}..."
docker save "${IMAGE}" | gzip | ssh "${SERVER_USER}@${SERVER_HOST}" "gunzip | docker load"

echo "▶ Avvio container sul server..."
ssh "${SERVER_USER}@${SERVER_HOST}" "
  set -e
  cd ${SERVER_DIR}
  docker compose up -d --remove-orphans
  docker image prune -f
"

echo "✓ Deploy completato. App in esecuzione su ${SERVER_HOST}:3000"
