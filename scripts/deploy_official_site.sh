#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."

SERVER_HOST="${LEAFTAB_SERVER_IP:-}"
SERVER_USER="${LEAFTAB_SERVER_USER:-root}"
SITE_DOMAIN="${LEAFTAB_SITE_DOMAIN:-leaftab.cc}"
SITE_INCLUDE_WWW="${LEAFTAB_SITE_INCLUDE_WWW:-true}"
API_UPSTREAM="${LEAFTAB_API_UPSTREAM:-localhost:3001}"
LOCAL_SITE_DIR="${LEAFTAB_LOCAL_SITE_DIR:-leaf-tab-official-site-main}"
REMOTE_SITE_DIR="${LEAFTAB_REMOTE_SITE_DIR:-/var/www/leaftab}"
REMOTE_SITE_BACKUP_DIR="${LEAFTAB_REMOTE_SITE_BACKUP_DIR:-/var/backups/leaftab-site}"
REMOTE_CADDYFILE="${LEAFTAB_REMOTE_CADDYFILE:-/etc/caddy/Caddyfile}"
ENABLE_LEGACY_API_PATHS="${LEAFTAB_ENABLE_LEGACY_API_PATHS:-true}"
UPDATE_CADDY="${LEAFTAB_UPDATE_CADDY:-false}"
SSH_MULTIPLEX="${LEAFTAB_SSH_MULTIPLEX:-true}"
SSH_CONTROL_PATH="${LEAFTAB_SSH_CONTROL_PATH:-/tmp/leaftab-site-ssh-%C}"
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

pack_website() {
  local src_dir="$1"
  local archive_path="$2"
  local tar_args=(
    -C "${src_dir}"
    -czf "${archive_path}"
    --exclude=".DS_Store"
    --exclude="*/.DS_Store"
    --exclude="._*"
    --exclude="*/._*"
  )

  # On macOS/bsdtar this strips Apple metadata (xattrs/resource forks).
  if tar --help 2>/dev/null | grep -q -- "--no-mac-metadata"; then
    tar_args+=(--no-mac-metadata)
  fi

  COPYFILE_DISABLE=1 tar "${tar_args[@]}" .
}

build_caddyfile() {
  local out="$1"
  cat > "${out}" <<EOF
${SITE_DOMAIN} {
    root * ${REMOTE_SITE_DIR}

    encode zstd gzip
    header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

    # Primary API path used by extension clients
    handle_path /api/* {
        reverse_proxy ${API_UPSTREAM}
    }
EOF

  if [ "${ENABLE_LEGACY_API_PATHS}" = "true" ]; then
    cat >> "${out}" <<EOF

    # Optional compatibility for legacy clients calling backend without /api prefix
    @legacy_api path /captcha /register /login /logout /auth/google /update/* /user/* /domains/* /admin/*
    handle @legacy_api {
        reverse_proxy ${API_UPSTREAM}
    }
EOF
  fi

  cat >> "${out}" <<EOF

    # Website static files
    handle {
        file_server
        try_files {path} {path}/ /index.html
    }
}
EOF

  if [ "${SITE_INCLUDE_WWW}" = "true" ]; then
    cat >> "${out}" <<EOF

www.${SITE_DOMAIN} {
    redir https://${SITE_DOMAIN}{uri} 308
}
EOF
  fi
}

if [ -z "${SERVER_HOST}" ]; then
  read -r -p "Enter server host/IP: " SERVER_HOST
fi

if [ -z "${SERVER_HOST}" ]; then
  error "Server host is required."
  exit 1
fi

if [ ! -d "${LOCAL_SITE_DIR}" ]; then
  error "Local site directory not found: ${LOCAL_SITE_DIR}"
  exit 1
fi

if [ ! -f "${LOCAL_SITE_DIR}/index.html" ]; then
  error "Missing ${LOCAL_SITE_DIR}/index.html"
  exit 1
fi

if [ ! -f "${LOCAL_SITE_DIR}/privacy/index.html" ]; then
  error "Missing ${LOCAL_SITE_DIR}/privacy/index.html"
  exit 1
fi

info "Deploy target: ${SERVER_USER}@${SERVER_HOST}"
info "Domain: ${SITE_DOMAIN}"
info "API upstream: ${API_UPSTREAM}"
info "Local site dir: ${LOCAL_SITE_DIR}"
info "Remote site dir: ${REMOTE_SITE_DIR}"
info "Remote site backup dir: ${REMOTE_SITE_BACKUP_DIR}"
info "Update Caddy: ${UPDATE_CADDY}"
info "Backend service will NOT be restarted by this script."

if [ "${SSH_MULTIPLEX}" = "true" ]; then
  info "Establishing SSH shared connection..."
  run_remote "true" >/dev/null
fi

TMP_ARCHIVE="$(mktemp /tmp/leaftab-site-XXXXXX.tgz)"

if [ "${UPDATE_CADDY}" = "true" ]; then
  TMP_CADDY="$(mktemp)"
  build_caddyfile "${TMP_CADDY}"
else
  TMP_CADDY=""
fi

info "Packing website..."
pack_website "${LOCAL_SITE_DIR}" "${TMP_ARCHIVE}"

REMOTE_ARCHIVE="/tmp/leaftab-site.tgz"
REMOTE_CADDY_CANDIDATE="/tmp/leaftab-site.Caddyfile"

info "Uploading website archive..."
copy_to_remote "${TMP_ARCHIVE}" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_ARCHIVE}"
if [ "${UPDATE_CADDY}" = "true" ]; then
  info "Uploading Caddy candidate..."
  copy_to_remote "${TMP_CADDY}" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_CADDY_CANDIDATE}"
fi

rm -f "${TMP_ARCHIVE}"
if [ -n "${TMP_CADDY}" ]; then
  rm -f "${TMP_CADDY}"
fi

API_STATUS_BEFORE="$(run_remote "curl -s -o /dev/null -w '%{http_code}' 'https://${SITE_DOMAIN}/api/captcha' || true" 2>/dev/null || true)"
if [ -n "${API_STATUS_BEFORE}" ]; then
  info "Pre-check API /api/captcha status: ${API_STATUS_BEFORE}"
fi

info "Extracting website files on server..."
run_remote "set -e; \
  mkdir -p '${REMOTE_SITE_BACKUP_DIR}'; \
  mkdir -p '${REMOTE_SITE_DIR}'; \
  if [ \"\$(ls -A '${REMOTE_SITE_DIR}' 2>/dev/null || true)\" ]; then \
    backup_name='site-'\"\$(date +%Y%m%d%H%M%S)\"'.tgz'; \
    tar -czf '${REMOTE_SITE_BACKUP_DIR}/'\${backup_name} -C '${REMOTE_SITE_DIR}' .; \
    echo '${REMOTE_SITE_BACKUP_DIR}/'\${backup_name} > /tmp/leaftab-site-last-backup-path.txt; \
  fi; \
  rm -rf '${REMOTE_SITE_DIR}'/*; \
  tar -xzmf '${REMOTE_ARCHIVE}' -C '${REMOTE_SITE_DIR}'; \
  find '${REMOTE_SITE_DIR}' -name '._*' -delete; \
  find '${REMOTE_SITE_DIR}' -name '.DS_Store' -delete; \
  rm -f '${REMOTE_ARCHIVE}'; \
  find '${REMOTE_SITE_DIR}' -type d -exec chmod 755 {} \; ; \
  find '${REMOTE_SITE_DIR}' -type f -exec chmod 644 {} \;"

if [ "${UPDATE_CADDY}" = "true" ]; then
  info "Validating and applying Caddy config..."
  run_remote "set -e; \
    caddy fmt -w '${REMOTE_CADDY_CANDIDATE}'; \
    caddy validate --config '${REMOTE_CADDY_CANDIDATE}'; \
    if [ -f '${REMOTE_CADDYFILE}' ]; then cp '${REMOTE_CADDYFILE}' '${REMOTE_CADDYFILE}.bak.\$(date +%Y%m%d%H%M%S)'; fi; \
    mv '${REMOTE_CADDY_CANDIDATE}' '${REMOTE_CADDYFILE}'; \
    caddy reload --config '${REMOTE_CADDYFILE}' || systemctl reload caddy || systemctl restart caddy"
else
  info "Skipping Caddy update (safe mode). Existing reverse proxy rules remain unchanged."
fi

info "Running health checks..."
run_remote "set +e; \
  code_site=\$(curl -s -o /dev/null -w '%{http_code}' 'https://${SITE_DOMAIN}/' || true); \
  code_privacy=\$(curl -s -o /dev/null -w '%{http_code}' 'https://${SITE_DOMAIN}/privacy/index.html' || true); \
  code_api=\$(curl -s -o /dev/null -w '%{http_code}' 'https://${SITE_DOMAIN}/api/captcha' || true); \
  echo \"Site / status: \$code_site\"; \
  echo \"Site /privacy/index.html status: \$code_privacy\"; \
  echo \"API /api/captcha status: \$code_api\"; \
  systemctl is-active --quiet caddy && echo 'Caddy: active' || echo 'Caddy: inactive'"

API_STATUS_AFTER="$(run_remote "curl -s -o /dev/null -w '%{http_code}' 'https://${SITE_DOMAIN}/api/captcha' || true" 2>/dev/null || true)"
LAST_SITE_BACKUP_PATH="$(run_remote "cat /tmp/leaftab-site-last-backup-path.txt 2>/dev/null || true" 2>/dev/null || true)"
run_remote "rm -f /tmp/leaftab-site-last-backup-path.txt" >/dev/null 2>&1 || true
if [ -n "${API_STATUS_BEFORE}" ] && [ -n "${API_STATUS_AFTER}" ]; then
  if [ "${API_STATUS_BEFORE}" != "${API_STATUS_AFTER}" ]; then
    warn "API status changed: ${API_STATUS_BEFORE} -> ${API_STATUS_AFTER}"
    warn "Please verify backend routing immediately."
  else
    info "API status unchanged after deploy: ${API_STATUS_AFTER}"
  fi
fi

info "Official site deploy complete."
echo "Website: https://${SITE_DOMAIN}/"
echo "Privacy page: https://${SITE_DOMAIN}/privacy/index.html"
echo "API remains under: https://${SITE_DOMAIN}/api/*"
if [ -n "${LAST_SITE_BACKUP_PATH}" ]; then
  echo "Static-site backup saved at: ${LAST_SITE_BACKUP_PATH}"
  echo "Rollback static site command:"
  echo "ssh ${SERVER_USER}@${SERVER_HOST} \"rm -rf '${REMOTE_SITE_DIR}'/* && tar -xzf '${LAST_SITE_BACKUP_PATH}' -C '${REMOTE_SITE_DIR}'\""
fi
