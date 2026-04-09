#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."

SERVER_HOST="${LEAFTAB_SERVER_IP:-${1:-}}"
SERVER_USER="${LEAFTAB_SERVER_USER:-root}"
SERVER_PORT="${LEAFTAB_SSH_PORT:-22}"
SITE_DOMAIN="${LEAFTAB_SITE_DOMAIN:-www.leaftab.cc}"
LOCAL_CALLBACK_FILE="${LEAFTAB_LOCAL_CALLBACK_FILE:-leaf-tab-official-site-main/google-auth-callback.html}"
REMOTE_SITE_DIR="${LEAFTAB_REMOTE_SITE_DIR:-/var/www/leaftab}"
REMOTE_CALLBACK_PATH="${LEAFTAB_REMOTE_CALLBACK_PATH:-${REMOTE_SITE_DIR}/google-auth-callback.html}"
REMOTE_BACKUP_DIR="${LEAFTAB_REMOTE_CALLBACK_BACKUP_DIR:-/var/backups/leaftab-site}"
SSH_CONTROL_PATH="${LEAFTAB_SSH_CONTROL_PATH:-/tmp/leaftab-google-callback-ssh-%C}"
SSH_CONTROL_PERSIST="${LEAFTAB_SSH_CONTROL_PERSIST:-15m}"

SSH_OPTS=(
  -p "${SERVER_PORT}"
  -o StrictHostKeyChecking=no
  -o ControlMaster=auto
  -o ControlPersist="${SSH_CONTROL_PERSIST}"
  -o ControlPath="${SSH_CONTROL_PATH}"
)

SCP_OPTS=(
  -P "${SERVER_PORT}"
  -o StrictHostKeyChecking=no
  -o ControlMaster=auto
  -o ControlPersist="${SSH_CONTROL_PERSIST}"
  -o ControlPath="${SSH_CONTROL_PATH}"
)

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
  scp "${SCP_OPTS[@]}" "$@"
}

if [ -z "${SERVER_HOST}" ]; then
  read -r -p "Enter server host/IP: " SERVER_HOST
fi

if [ -z "${SERVER_HOST}" ]; then
  error "Server host is required."
  exit 1
fi

if [ ! -f "${LOCAL_CALLBACK_FILE}" ]; then
  error "Local callback file not found: ${LOCAL_CALLBACK_FILE}"
  exit 1
fi

info "Deploy target: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}"
info "Site domain: ${SITE_DOMAIN}"
info "Local callback file: ${LOCAL_CALLBACK_FILE}"
info "Remote callback path: ${REMOTE_CALLBACK_PATH}"
info "Remote backup dir: ${REMOTE_BACKUP_DIR}"

REMOTE_TMP="/tmp/leaftab-google-auth-callback.html"

info "Establishing SSH connection..."
run_remote "true" >/dev/null

info "Uploading callback page..."
copy_to_remote "${LOCAL_CALLBACK_FILE}" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_TMP}"

info "Installing callback page on server..."
run_remote "set -e; \
  mkdir -p '${REMOTE_SITE_DIR}' '${REMOTE_BACKUP_DIR}'; \
  if [ -f '${REMOTE_CALLBACK_PATH}' ]; then \
    cp '${REMOTE_CALLBACK_PATH}' '${REMOTE_BACKUP_DIR}/google-auth-callback.html.'\"\$(date +%Y%m%d%H%M%S)\"'.bak'; \
  fi; \
  install -m 644 '${REMOTE_TMP}' '${REMOTE_CALLBACK_PATH}'; \
  rm -f '${REMOTE_TMP}'"

info "Verifying remote file contents..."
run_remote "set -e; grep -q 'leaf-tab-google-auth' '${REMOTE_CALLBACK_PATH}'"

info "Running HTTP health check..."
HTTP_HEADERS="$(curl -I -L --max-redirs 3 --silent --show-error "https://${SITE_DOMAIN}/google-auth-callback.html" || true)"
echo "${HTTP_HEADERS}"

HTTP_BODY_SAMPLE="$(curl -sL --max-redirs 3 "https://${SITE_DOMAIN}/google-auth-callback.html" | sed -n '1,30p' || true)"
echo "${HTTP_BODY_SAMPLE}"

if echo "${HTTP_BODY_SAMPLE}" | grep -q 'leaf-tab-google-auth'; then
  info "Deployment succeeded: callback page is live."
else
  warn "Remote file was uploaded, but HTTP response does not look like the callback page yet."
  warn "This usually means the website root or reverse-proxy path is serving a different directory."
fi
