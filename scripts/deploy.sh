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
if ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "command -v caddy" >/dev/null 2>&1; then
    print_info "Caddy is already installed."
else
    print_info "Caddy NOT found. Uploading installer..."
    scp -o StrictHostKeyChecking=no scripts/install_caddy.sh "${USER}@${SERVER_IP}:/tmp/install_caddy.sh"
    print_info "Running installer (This may take a minute)..."
    ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "chmod +x /tmp/install_caddy.sh && bash /tmp/install_caddy.sh"
fi

# 3. Skip Frontend Upload (Extension Mode)
print_info "Skipping Frontend upload (Extension mode detected)..."
# Optional: We might want to upload a landing page or the .zip file later, but not the raw assets.

# 4. Deploy Backend
print_info "Deploying Backend..."
ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "mkdir -p ${BACKEND_REMOTE_DIR}"

print_info "Uploading server files..."
# Create a temporary directory for clean upload
TEMP_DIR=$(mktemp -d)
mkdir -p "${TEMP_DIR}/server"
cp server/package.json server/package-lock.json server/index.js server/clear_users.js "${TEMP_DIR}/server/"

# Copy files from temp to server
scp -o StrictHostKeyChecking=no "${TEMP_DIR}/server/"* "${USER}@${SERVER_IP}:${BACKEND_REMOTE_DIR}/"
rm -rf "${TEMP_DIR}"

# Install Backend Dependencies
print_info "Installing backend dependencies on server..."
ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "cd ${BACKEND_REMOTE_DIR} && npm install --production"

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
    scp -o StrictHostKeyChecking=no deployment/leaftab-backend.env "${USER}@${SERVER_IP}:/etc/leaftab-backend.env"
    ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "chmod 600 /etc/leaftab-backend.env"
    if ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "grep -q '^ADMIN_API_KEY=' /etc/leaftab-backend.env"; then
        print_info "ADMIN_API_KEY found in /etc/leaftab-backend.env"
    else
        print_warning "ADMIN_API_KEY missing in uploaded env file. Generating and appending one..."
        ADMIN_KEY=$(generate_admin_key)
        ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "umask 077 && echo 'ADMIN_API_KEY=${ADMIN_KEY}' >> /etc/leaftab-backend.env && chmod 600 /etc/leaftab-backend.env"
        print_info "ADMIN_API_KEY generated:"
        echo "${ADMIN_KEY}"
        print_warning "Please save this key. You will paste it into Settings -> Admin Mode -> Admin Key."
    fi
else
    print_warning "deployment/leaftab-backend.env not found."
    if ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "test -f /etc/leaftab-backend.env"; then
        if ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "grep -q '^ADMIN_API_KEY=' /etc/leaftab-backend.env"; then
            print_warning "/etc/leaftab-backend.env already exists on server; keeping existing config."
            print_warning "If you forgot ADMIN_API_KEY, open /etc/leaftab-backend.env on server to view it."
        else
            print_warning "/etc/leaftab-backend.env exists, but ADMIN_API_KEY is missing."
            print_info "Generating and appending ADMIN_API_KEY..."
            ADMIN_KEY=$(generate_admin_key)
            ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "umask 077 && echo 'ADMIN_API_KEY=${ADMIN_KEY}' >> /etc/leaftab-backend.env && chmod 600 /etc/leaftab-backend.env"
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
        scp -o StrictHostKeyChecking=no "${ENV_TMP}" "${USER}@${SERVER_IP}:/etc/leaftab-backend.env"
        rm -f "${ENV_TMP}"
        ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "chmod 600 /etc/leaftab-backend.env"
        print_info "ADMIN_API_KEY generated:"
        echo "${ADMIN_KEY}"
        print_warning "Please save this key. You will paste it into Settings -> Admin Mode -> Admin Key."
    fi
fi

# Setup Systemd Service
print_info "Configuring Backend Service..."
if [ -f "deployment/leaftab-backend.service" ]; then
    scp -o StrictHostKeyChecking=no deployment/leaftab-backend.service "${USER}@${SERVER_IP}:/etc/systemd/system/leaftab-backend.service"
    ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "systemctl daemon-reload && systemctl enable leaftab-backend && systemctl restart leaftab-backend"
else
    print_warning "leaftab-backend.service file not found in deployment folder."
fi

# 4.1 Upload and validate Caddyfile
print_info "Uploading Caddyfile..."
if [ -f "deployment/Caddyfile" ]; then
    scp -o StrictHostKeyChecking=no deployment/Caddyfile "${USER}@${SERVER_IP}:/etc/caddy/Caddyfile"
    print_info "Validating Caddyfile on server..."
    ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "caddy fmt -w /etc/caddy/Caddyfile && caddy validate --config /etc/caddy/Caddyfile || (echo 'Caddy validation failed' && exit 1)"
else
    print_warning "deployment/Caddyfile not found; skipping upload."
fi

# 5. Cleanup Old Frontend Files (Skip this step as we already cleaned up)
# print_info "Cleaning up old frontend files on server..."
# ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "rm -rf ${REMOTE_DIR}/*"
# print_info "Server cleanup complete."

# 6. Restart Caddy (Only if serving API via Caddy reverse proxy)
print_info "Restarting Caddy on server..."
ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "caddy reload --config /etc/caddy/Caddyfile || systemctl reload caddy || caddy start --config /etc/caddy/Caddyfile"

# 7. Health checks
print_info "Running health checks..."
ssh -o StrictHostKeyChecking=no ${USER}@${SERVER_IP} "set -e; \
  code_api=\$(curl -s -o /dev/null -w '%{http_code}' ${PUBLIC_ORIGIN}/api/ || true); \
  echo \"API root status: \$code_api\"; \
  code_captcha=\$(curl -s -o /dev/null -w '%{http_code}' ${PUBLIC_ORIGIN}/api/captcha || true); \
  echo \"Captcha endpoint status: \$code_captcha\"; \
  systemctl is-active --quiet leaftab-backend && echo 'Backend service: active' || (echo 'Backend service: inactive' && systemctl status leaftab-backend --no-pager | head -n 50)"

print_info "Backend Deployment Complete!"
echo "Visit ${PUBLIC_ORIGIN} to verify."
