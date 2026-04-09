#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."

SERVER_HOST="${LEAFTAB_SERVER_IP:-}"
SERVER_USER="${LEAFTAB_SERVER_USER:-root}"
SITE_DOMAIN="${LEAFTAB_SITE_DOMAIN:-leaftab.cc}"
BACKEND_REMOTE_DIR="${LEAFTAB_BACKEND_REMOTE_DIR:-/var/www/leaftab-server}"
BACKEND_BACKUP_DIR="${LEAFTAB_BACKEND_BACKUP_DIR:-/var/backups/leaftab-backend}"
BACKEND_SERVICE="${LEAFTAB_BACKEND_SERVICE:-leaftab-backend}"
SKIP_HEALTH_CHECK="${LEAFTAB_SKIP_HEALTH_CHECK:-false}"

SSH_MULTIPLEX="${LEAFTAB_SSH_MULTIPLEX:-true}"
SSH_CONTROL_PATH="${LEAFTAB_SSH_CONTROL_PATH:-/tmp/leaftab-backend-ssh-%C}"
SSH_CONTROL_PERSIST="${LEAFTAB_SSH_CONTROL_PERSIST:-15m}"

SSH_OPTS=(-o StrictHostKeyChecking=no)
if [ "${SSH_MULTIPLEX}" = "true" ]; then
  SSH_OPTS+=(
    -o ControlMaster=auto
    -o ControlPersist="${SSH_CONTROL_PERSIST}"
    -o ControlPath="${SSH_CONTROL_PATH}"
  )
fi

info() {
  echo -e "\033[1;34m>>> $1\033[0m"
}

warn() {
  echo -e "\033[1;33m>>> WARNING: $1\033[0m"
}

error() {
  echo -e "\033[1;31m>>> ERROR: $1\033[0m"
}

run_remote() {
  ssh "${SSH_OPTS[@]}" "${SERVER_USER}@${SERVER_HOST}" "$@"
}

copy_to_remote() {
  scp "${SSH_OPTS[@]}" "$@"
}

if [ -z "${SERVER_HOST}" ]; then
  read -r -p "Enter server host/IP: " SERVER_HOST
fi

if [ -z "${SERVER_HOST}" ]; then
  error "Server host/IP is required."
  exit 1
fi

if [ ! -d "server" ]; then
  error "Missing local server directory: $(pwd)/server"
  exit 1
fi

info "Target: ${SERVER_USER}@${SERVER_HOST}"
info "Remote backend dir: ${BACKEND_REMOTE_DIR}"
info "Remote backup dir: ${BACKEND_BACKUP_DIR}"
info "Backend service: ${BACKEND_SERVICE}"
info "Site domain for health check: ${SITE_DOMAIN}"
info "This script updates backend code only; it will NOT modify Caddy or website files."

if [ "${SSH_MULTIPLEX}" = "true" ]; then
  info "Establishing SSH shared connection..."
  run_remote "true" >/dev/null
fi

TMP_UPLOAD_DIR="$(mktemp -d /tmp/leaftab-backend-upload-XXXXXX)"
trap 'rm -rf "${TMP_UPLOAD_DIR}"' EXIT

mkdir -p "${TMP_UPLOAD_DIR}/server"
cp server/package.json server/package-lock.json "${TMP_UPLOAD_DIR}/server/"
cp server/*.js "${TMP_UPLOAD_DIR}/server/"
if [ -d "server/lib" ]; then
  mkdir -p "${TMP_UPLOAD_DIR}/server/lib"
  cp -R server/lib/. "${TMP_UPLOAD_DIR}/server/lib/"
fi
if [ -d "server/routes" ]; then
  mkdir -p "${TMP_UPLOAD_DIR}/server/routes"
  cp -R server/routes/. "${TMP_UPLOAD_DIR}/server/routes/"
fi

REMOTE_UPLOAD_DIR="/tmp/leaftab-backend-upload"

info "Uploading backend files..."
run_remote "rm -rf '${REMOTE_UPLOAD_DIR}' && mkdir -p '${REMOTE_UPLOAD_DIR}'"
copy_to_remote -r "${TMP_UPLOAD_DIR}/server/." "${SERVER_USER}@${SERVER_HOST}:${REMOTE_UPLOAD_DIR}/"

info "Installing backend on server and restarting service..."
run_remote "set -e; \
  mkdir -p '${BACKEND_BACKUP_DIR}'; \
  if [ -d '${BACKEND_REMOTE_DIR}' ] && [ \"\$(ls -A '${BACKEND_REMOTE_DIR}' 2>/dev/null || true)\" ]; then \
    backup_name='backend-'\"\$(date +%Y%m%d%H%M%S)\"'.tgz'; \
    tar -czf '${BACKEND_BACKUP_DIR}/'\${backup_name} -C '${BACKEND_REMOTE_DIR}' .; \
    echo '${BACKEND_BACKUP_DIR}/'\${backup_name} > /tmp/leaftab-backend-last-backup-path.txt; \
  fi; \
  mkdir -p '${BACKEND_REMOTE_DIR}'; \
  cp -R '${REMOTE_UPLOAD_DIR}/'. '${BACKEND_REMOTE_DIR}/'; \
  cd '${BACKEND_REMOTE_DIR}'; \
  npm install --production; \
  systemctl daemon-reload || true; \
  systemctl restart '${BACKEND_SERVICE}'; \
  systemctl is-active --quiet '${BACKEND_SERVICE}'; \
  rm -rf '${REMOTE_UPLOAD_DIR}'"

BACKUP_PATH="$(run_remote "cat /tmp/leaftab-backend-last-backup-path.txt 2>/dev/null || true" || true)"
run_remote "rm -f /tmp/leaftab-backend-last-backup-path.txt" >/dev/null 2>&1 || true

if [ "${SKIP_HEALTH_CHECK}" != "true" ]; then
  info "Health check: POST https://${SITE_DOMAIN}/api/auth/google"
  CHECK_CODE="$(run_remote "curl -sL -o /tmp/leaftab-backend-health.json -w '%{http_code}' -X POST 'https://${SITE_DOMAIN}/api/auth/google' -H 'Content-Type: application/json' --data '{}' || true" || true)"
  CHECK_BODY="$(run_remote "cat /tmp/leaftab-backend-health.json 2>/dev/null || true" || true)"
  run_remote "rm -f /tmp/leaftab-backend-health.json" >/dev/null 2>&1 || true

  echo "Health check status: ${CHECK_CODE}"
  echo "Health check body: ${CHECK_BODY}"

  case "${CHECK_CODE}" in
    400)
      info "Backend route /auth/google is active (missing token is expected for this check)."
      ;;
    401)
      info "Backend route /auth/google is active (invalid token is expected for this check)."
      ;;
    429)
      warn "Route is active, but rate limit was hit."
      ;;
    503)
      warn "Route exists but Google login is disabled on server env (check GOOGLE_OAUTH_CLIENT_IDS)."
      ;;
    404)
      warn "Still 404: likely old backend process or wrong service path. Please verify ${BACKEND_SERVICE} -> ${BACKEND_REMOTE_DIR}."
      ;;
    *)
      warn "Unexpected status: ${CHECK_CODE}. Please verify manually."
      ;;
  esac
else
  info "Skipping health check (LEAFTAB_SKIP_HEALTH_CHECK=true)."
fi

info "Done."
if [ -n "${BACKUP_PATH}" ]; then
  echo "Backup file: ${BACKUP_PATH}"
  echo "Rollback command:"
  echo "ssh ${SERVER_USER}@${SERVER_HOST} \"rm -rf '${BACKEND_REMOTE_DIR}'/* && tar -xzf '${BACKUP_PATH}' -C '${BACKEND_REMOTE_DIR}' && systemctl restart '${BACKEND_SERVICE}'\""
fi
