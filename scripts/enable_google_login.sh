#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."

SERVER_HOST="${LEAFTAB_SERVER_IP:-}"
SERVER_USER="${LEAFTAB_SERVER_USER:-root}"
SITE_DOMAIN="${LEAFTAB_SITE_DOMAIN:-leaftab.cc}"
GOOGLE_CLIENT_IDS="${LEAFTAB_GOOGLE_OAUTH_CLIENT_IDS:-352087600211-6cu9ot6j7n16927c9blblpcotnimfel2.apps.googleusercontent.com}"
BACKEND_ENV_REMOTE_PATH="${LEAFTAB_BACKEND_ENV_REMOTE_PATH:-/etc/leaftab-backend.env}"
BACKEND_SERVICE="${LEAFTAB_BACKEND_SERVICE:-leaftab-backend}"
SKIP_HEALTH_CHECK="${LEAFTAB_SKIP_HEALTH_CHECK:-false}"

SSH_MULTIPLEX="${LEAFTAB_SSH_MULTIPLEX:-true}"
SSH_CONTROL_PATH="${LEAFTAB_SSH_CONTROL_PATH:-/tmp/leaftab-google-ssh-%C}"
SSH_CONTROL_PERSIST="${LEAFTAB_SSH_CONTROL_PERSIST:-15m}"

SSH_OPTS=(
  -o StrictHostKeyChecking=no
)

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

if [ -z "${SERVER_HOST}" ]; then
  read -r -p "Enter server host/IP: " SERVER_HOST
fi

if [ -z "${SERVER_HOST}" ]; then
  error "Server host/IP is required."
  exit 1
fi

read -r -p "Google Client ID(s) [${GOOGLE_CLIENT_IDS}]: " INPUT_CLIENT_IDS
if [ -n "${INPUT_CLIENT_IDS}" ]; then
  GOOGLE_CLIENT_IDS="${INPUT_CLIENT_IDS}"
fi

if [ -z "${GOOGLE_CLIENT_IDS}" ]; then
  error "GOOGLE_OAUTH_CLIENT_IDS cannot be empty."
  exit 1
fi

info "Target: ${SERVER_USER}@${SERVER_HOST}"
info "Env file: ${BACKEND_ENV_REMOTE_PATH}"
info "Backend service: ${BACKEND_SERVICE}"
info "Site domain for health check: ${SITE_DOMAIN}"
info "Google client IDs: ${GOOGLE_CLIENT_IDS}"

if [ "${SSH_MULTIPLEX}" = "true" ]; then
  info "Establishing SSH shared connection..."
  run_remote "true" >/dev/null
fi

REMOTE_ENV_QUOTED=$(printf "%q" "${BACKEND_ENV_REMOTE_PATH}")
REMOTE_IDS_QUOTED=$(printf "%q" "${GOOGLE_CLIENT_IDS}")
REMOTE_SERVICE_QUOTED=$(printf "%q" "${BACKEND_SERVICE}")

info "Updating remote backend env and restarting service..."
BACKUP_PATH="$(
  run_remote "bash -s -- ${REMOTE_ENV_QUOTED} ${REMOTE_IDS_QUOTED} ${REMOTE_SERVICE_QUOTED}" <<'REMOTE_SCRIPT'
set -euo pipefail

ENV_PATH="$1"
GOOGLE_IDS="$2"
SERVICE_NAME="$3"

if [ -z "${GOOGLE_IDS}" ]; then
  echo "GOOGLE_OAUTH_CLIENT_IDS cannot be empty" >&2
  exit 1
fi

if [ ! -f "${ENV_PATH}" ]; then
  install -m 600 /dev/null "${ENV_PATH}"
fi

BACKUP_PATH="${ENV_PATH}.bak.$(date +%Y%m%d%H%M%S)"
cp "${ENV_PATH}" "${BACKUP_PATH}"

awk -v value="${GOOGLE_IDS}" '
  BEGIN { done = 0 }
  /^[[:space:]]*GOOGLE_OAUTH_CLIENT_IDS=/ {
    if (!done) {
      print "GOOGLE_OAUTH_CLIENT_IDS=" value
      done = 1
    }
    next
  }
  { print }
  END {
    if (!done) print "GOOGLE_OAUTH_CLIENT_IDS=" value
  }
' "${ENV_PATH}" > "${ENV_PATH}.tmp"

mv "${ENV_PATH}.tmp" "${ENV_PATH}"
chmod 600 "${ENV_PATH}" || true

if command -v systemctl >/dev/null 2>&1; then
  systemctl restart "${SERVICE_NAME}"
  systemctl is-active --quiet "${SERVICE_NAME}"
fi

echo "${BACKUP_PATH}"
REMOTE_SCRIPT
)"

CURRENT_LINE="$(run_remote "grep -E '^[[:space:]]*GOOGLE_OAUTH_CLIENT_IDS=' '${BACKEND_ENV_REMOTE_PATH}' | tail -n 1" || true)"
if [ -n "${CURRENT_LINE}" ]; then
  info "Current setting: ${CURRENT_LINE}"
fi

if [ "${SKIP_HEALTH_CHECK}" != "true" ]; then
  info "Running health check: POST https://${SITE_DOMAIN}/api/auth/google"
  CHECK_CODE="$(run_remote "curl -sL -o /tmp/leaftab-google-login-check.json -w '%{http_code}' -X POST 'https://${SITE_DOMAIN}/api/auth/google' -H 'Content-Type: application/json' --data '{}' || true" || true)"
  CHECK_BODY="$(run_remote "cat /tmp/leaftab-google-login-check.json 2>/dev/null || true" || true)"
  run_remote "rm -f /tmp/leaftab-google-login-check.json" >/dev/null 2>&1 || true

  echo "Health check status: ${CHECK_CODE}"
  echo "Health check body: ${CHECK_BODY}"

  case "${CHECK_CODE}" in
    400|401|429)
      info "Google login endpoint is reachable."
      ;;
    503)
      warn "Endpoint returned 503 (usually means GOOGLE_OAUTH_CLIENT_IDS not applied or service not reloaded)."
      ;;
    404)
      warn "Endpoint returned 404. This usually means backend code is old and /auth/google is not deployed yet."
      warn "Run: bash scripts/deploy_backend_only.sh"
      ;;
    *)
      warn "Unexpected health check status: ${CHECK_CODE}. Please verify Caddy route /api/* and backend service."
      ;;
  esac
else
  info "Skipping health check (LEAFTAB_SKIP_HEALTH_CHECK=true)."
fi

info "Done."
echo "Backup file: ${BACKUP_PATH}"
echo "If needed, rollback command:"
echo "ssh ${SERVER_USER}@${SERVER_HOST} \"cp '${BACKUP_PATH}' '${BACKEND_ENV_REMOTE_PATH}' && systemctl restart '${BACKEND_SERVICE}'\""
