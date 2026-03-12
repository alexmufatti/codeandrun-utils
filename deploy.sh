#!/bin/bash
set -euo pipefail

# ── Configurazione ──────────────────────────────────────────────────────────
SERVER_USER="mua"
SERVER_HOST="192.168.252.251" #"timmy.pistulinux"
SERVER_DIR="/data/utils"   # cartella sul server con .env.local e docker-compose.yml
IMAGE_NAME="codeandrun-web"
IMAGE_TAG="latest"
# ────────────────────────────────────────────────────────────────────────────

IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
SYNC_IMAGE="codeandrun-garmin-sync:latest"

echo "▶ Build immagine Docker: ${IMAGE}"
docker build --platform linux/amd64 -t "${IMAGE}" .

echo "▶ Build immagine garmin-sync: ${SYNC_IMAGE}"
docker build --platform linux/amd64 -t "${SYNC_IMAGE}" garmin-sync/

echo "▶ Trasferimento immagini al server ${SERVER_HOST}..."
docker save "${IMAGE}" "${SYNC_IMAGE}" | gzip | ssh "${SERVER_USER}@${SERVER_HOST}" "gunzip | docker load"

echo "▶ Avvio container sul server..."
ssh "${SERVER_USER}@${SERVER_HOST}" "
  set -e
  cd ${SERVER_DIR}
  docker compose up -d --remove-orphans
  docker image prune -f
"

echo "✓ Deploy completato. App in esecuzione su ${SERVER_HOST}:3000"
