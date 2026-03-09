#!/bin/bash

# Exit on error
set -e

# Ensure we are in the project root directory
cd "$(dirname "$0")/.."

# Server Configuration
SERVER_IP="${LEAFTAB_SERVER_IP:-YOUR_SERVER_IP}"
USER="${LEAFTAB_SERVER_USER:-root}"
REMOTE_DIR="${LEAFTAB_REMOTE_DIR:-/var/www/leaftab}"
BACKEND_REMOTE_DIR="${LEAFTAB_BACKEND_REMOTE_DIR:-/var/www/leaftab-server}"
PUBLIC_ORIGIN="${LEAFTAB_PUBLIC_ORIGIN:-https://example.com}"
SSH_MULTIPLEX="${LEAFTAB_SSH_MULTIPLEX:-true}"
SSH_CONTROL_PATH="${LEAFTAB_SSH_CONTROL_PATH:-/tmp/leaftab-ssh-%C}"
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

# Function to print colored output
print_info() {
    echo -e "\033[1;34m>>> $1\033[0m"
}

print_warning() {
    echo -e "\033[1;33m>>> WARNING: $1\033[0m"
}

print_error() {
    echo -e "\033[1;31m>>> ERROR: $1\033[0m"
}

extract_host_from_origin() {
    local origin="$1"
    local host="${origin#http://}"
    host="${host#https://}"
    host="${host%%/*}"
    host="${host%%:*}"
    echo "${host}"
}

is_ipv4_host() {
    local host="$1"
    [[ "${host}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

build_caddyfile_for_origin() {
    local origin="$1"
    local static_root="$2"
    local host
    host="$(extract_host_from_origin "${origin}")"

    if [ -z "${host}" ]; then
        print_error "Invalid LEAFTAB_PUBLIC_ORIGIN: ${origin}"
        exit 1
    fi

    local caddy_tmp
    caddy_tmp="$(mktemp)"

    if is_ipv4_host "${host}" || [ "${host}" = "localhost" ]; then
        cat > "${caddy_tmp}" <<EOF
http://${host} {
    root * ${static_root}

    handle_path /api/* {
        reverse_proxy localhost:3001
    }

    handle {
        file_server
        try_files {path} /index.html
    }
}
EOF
    else
        local primary_host="${host}"
        local secondary_host=""
        if [[ "${host}" == www.* ]]; then
            secondary_host="${host#www.}"
        elif [[ "${host}" == *.* ]]; then
            secondary_host="www.${host}"
        fi
        cat > "${caddy_tmp}" <<EOF
${primary_host} {
    root * ${static_root}

    header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

    handle_path /api/* {
        reverse_proxy localhost:3001
    }

    handle {
        file_server
        try_files {path} /index.html
    }
}
EOF
        if [ -n "${secondary_host}" ]; then
            cat >> "${caddy_tmp}" <<EOF

${secondary_host} {
    redir https://${primary_host}{uri}
}
EOF
        fi
    fi

    echo "${caddy_tmp}"
}

run_remote() {
    ssh "${SSH_OPTS[@]}" "${USER}@${SERVER_IP}" "$@"
}

copy_to_remote() {
    scp "${SSH_OPTS[@]}" "$@"
}

if [ "${SSH_MULTIPLEX}" = "true" ]; then
    print_info "Establishing SSH shared connection (you should only need to enter password once)..."
    run_remote "true" >/dev/null
fi

# 1. Build Frontend
print_info "Checking for npm..."
if command -v npm >/dev/null 2>&1; then
    print_info "npm found. Building frontend..."
    npm run build
else
    print_info "npm NOT found."
    if [ -d "build" ]; then
        print_warning "Using existing 'build' directory because npm is missing."
        print_warning "Note: Changes in 'src' will NOT be deployed until you install Node.js and rebuild."
    else
        print_error "npm is missing AND 'build' directory does not exist."
        print_error "Please install Node.js from https://nodejs.org/ to build the project."
        exit 1
    fi
fi

# 2. Check and Install Caddy
print_info "Checking if Caddy is installed on server..."
if run_remote "command -v caddy" >/dev/null 2>&1; then
    print_info "Caddy is already installed."
else
    print_info "Caddy NOT found. Uploading installer..."
    copy_to_remote scripts/install_caddy.sh "${USER}@${SERVER_IP}:/tmp/install_caddy.sh"
    print_info "Running installer (This may take a minute)..."
    run_remote "chmod +x /tmp/install_caddy.sh && bash /tmp/install_caddy.sh"
fi

# 3. Skip Frontend Upload (Extension Mode)
print_info "Skipping Frontend upload (Extension mode detected)..."
# Optional: We might want to upload a landing page or the .zip file later, but not the raw assets.

# 4. Deploy Backend
print_info "Deploying Backend..."
run_remote "mkdir -p ${BACKEND_REMOTE_DIR}"

print_info "Uploading server files..."
# Create a temporary directory for clean upload
TEMP_DIR=$(mktemp -d)
mkdir -p "${TEMP_DIR}/server"
cp server/package.json server/package-lock.json server/index.js server/clear_users.js "${TEMP_DIR}/server/"

# Copy files from temp to server
copy_to_remote "${TEMP_DIR}/server/"* "${USER}@${SERVER_IP}:${BACKEND_REMOTE_DIR}/"
rm -rf "${TEMP_DIR}"

# Install Backend Dependencies
print_info "Installing backend dependencies on server..."
run_remote "cd ${BACKEND_REMOTE_DIR} && npm install --production"

# Generate an admin key (for exporting collected domains)
generate_admin_key() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 24
        return 0
    fi
    if command -v python3 >/dev/null 2>&1; then
        python3 - <<'PY'
import secrets
print(secrets.token_hex(24))
PY
        return 0
    fi
    if command -v node >/dev/null 2>&1; then
        node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
        return 0
    fi
    echo "change-this-admin-key"
}

# Upload backend env file (optional)
print_info "Configuring backend environment..."
if [ -f "deployment/leaftab-backend.env" ]; then
    print_info "Uploading deployment/leaftab-backend.env to /etc/leaftab-backend.env"
    copy_to_remote deployment/leaftab-backend.env "${USER}@${SERVER_IP}:/etc/leaftab-backend.env"
    run_remote "chmod 600 /etc/leaftab-backend.env"
    if run_remote "grep -q '^ADMIN_API_KEY=' /etc/leaftab-backend.env"; then
        print_info "ADMIN_API_KEY found in /etc/leaftab-backend.env"
    else
        print_warning "ADMIN_API_KEY missing in uploaded env file. Generating and appending one..."
        ADMIN_KEY=$(generate_admin_key)
        run_remote "umask 077 && echo 'ADMIN_API_KEY=${ADMIN_KEY}' >> /etc/leaftab-backend.env && chmod 600 /etc/leaftab-backend.env"
        print_info "ADMIN_API_KEY generated:"
        echo "${ADMIN_KEY}"
        print_warning "Please save this key. You will paste it into Settings -> Admin Mode -> Admin Key."
    fi
else
    print_warning "deployment/leaftab-backend.env not found."
    if run_remote "test -f /etc/leaftab-backend.env"; then
        if run_remote "grep -q '^ADMIN_API_KEY=' /etc/leaftab-backend.env"; then
            print_warning "/etc/leaftab-backend.env already exists on server; keeping existing config."
            print_warning "If you forgot ADMIN_API_KEY, open /etc/leaftab-backend.env on server to view it."
        else
            print_warning "/etc/leaftab-backend.env exists, but ADMIN_API_KEY is missing."
            print_info "Generating and appending ADMIN_API_KEY..."
            ADMIN_KEY=$(generate_admin_key)
            run_remote "umask 077 && echo 'ADMIN_API_KEY=${ADMIN_KEY}' >> /etc/leaftab-backend.env && chmod 600 /etc/leaftab-backend.env"
            print_info "ADMIN_API_KEY generated:"
            echo "${ADMIN_KEY}"
            print_warning "Please save this key. You will paste it into Settings -> Admin Mode -> Admin Key."
        fi
    else
        print_info "Creating /etc/leaftab-backend.env on server with a generated ADMIN_API_KEY..."
        ADMIN_KEY=$(generate_admin_key)
        ENV_TMP=$(mktemp)
        cat > "${ENV_TMP}" <<EOF
NODE_ENV=production
JWT_SECRET=change-this-in-production
SESSION_SECRET=change-this-in-production
CLIENT_URLS=${PUBLIC_ORIGIN}
ADMIN_API_KEY=${ADMIN_KEY}
EOF
        copy_to_remote "${ENV_TMP}" "${USER}@${SERVER_IP}:/etc/leaftab-backend.env"
        rm -f "${ENV_TMP}"
        run_remote "chmod 600 /etc/leaftab-backend.env"
        print_info "ADMIN_API_KEY generated:"
        echo "${ADMIN_KEY}"
        print_warning "Please save this key. You will paste it into Settings -> Admin Mode -> Admin Key."
    fi
fi

# Setup Systemd Service
print_info "Configuring Backend Service..."
if [ -f "deployment/leaftab-backend.service" ]; then
    copy_to_remote deployment/leaftab-backend.service "${USER}@${SERVER_IP}:/etc/systemd/system/leaftab-backend.service"
    run_remote "systemctl daemon-reload && systemctl enable leaftab-backend"
else
    print_warning "leaftab-backend.service file not found in deployment folder. Keeping existing service unit."
fi

print_info "Restarting Backend Service..."
run_remote "if systemctl cat leaftab-backend >/dev/null 2>&1; then \
  systemctl daemon-reload && systemctl restart leaftab-backend && systemctl is-active --quiet leaftab-backend; \
else \
  echo 'leaftab-backend.service not found on server.'; \
  exit 1; \
fi"

# 4.1 Upload and validate Caddyfile
print_info "Uploading Caddyfile..."
CADDY_TMP="$(build_caddyfile_for_origin "${PUBLIC_ORIGIN}" "${REMOTE_DIR}")"
copy_to_remote "${CADDY_TMP}" "${USER}@${SERVER_IP}:/etc/caddy/Caddyfile"
rm -f "${CADDY_TMP}"
print_info "Validating Caddyfile on server..."
run_remote "caddy fmt -w /etc/caddy/Caddyfile && caddy validate --config /etc/caddy/Caddyfile || (echo 'Caddy validation failed' && exit 1)"

# 5. Cleanup Old Frontend Files (Skip this step as we already cleaned up)
# print_info "Cleaning up old frontend files on server..."
# ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "rm -rf ${REMOTE_DIR}/*"
# print_info "Server cleanup complete."

# 6. Restart Caddy (Only if serving API via Caddy reverse proxy)
print_info "Restarting Caddy on server..."
run_remote "caddy reload --config /etc/caddy/Caddyfile || systemctl reload caddy || caddy start --config /etc/caddy/Caddyfile"

# 7. Health checks
print_info "Running health checks..."
run_remote "set -e; \
  code_api=\$(curl -s -o /dev/null -w '%{http_code}' ${PUBLIC_ORIGIN}/api/ || true); \
  echo \"API root status: \$code_api\"; \
  code_captcha=\$(curl -s -o /dev/null -w '%{http_code}' ${PUBLIC_ORIGIN}/api/captcha || true); \
  echo \"Captcha endpoint status: \$code_captcha\"; \
  systemctl is-active --quiet leaftab-backend && echo 'Backend service: active' || (echo 'Backend service: inactive' && systemctl status leaftab-backend --no-pager | head -n 50)"

# 8. Fetch admin key for domain export (best-effort)
print_info "Fetching ADMIN_API_KEY from server..."
REMOTE_ADMIN_KEY="$(run_remote "grep -E '^ADMIN_API_KEY=' /etc/leaftab-backend.env | tail -n 1 | cut -d'=' -f2-" 2>/dev/null || true)"
if [ -n "${REMOTE_ADMIN_KEY}" ]; then
    print_info "ADMIN_API_KEY:"
    echo "${REMOTE_ADMIN_KEY}"
    print_warning "Keep this key safe. It can export collected domain stats."
else
    print_warning "Could not read ADMIN_API_KEY from /etc/leaftab-backend.env"
    print_warning "You can fetch it manually with:"
    echo "ssh ${USER}@${SERVER_IP} \"grep -E '^ADMIN_API_KEY=' /etc/leaftab-backend.env | tail -n 1 | cut -d'=' -f2-\""
fi

print_info "Backend Deployment Complete!"
echo "Visit ${PUBLIC_ORIGIN} to verify."
