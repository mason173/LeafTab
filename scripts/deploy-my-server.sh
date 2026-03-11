#!/bin/bash

set -e

# Ensure this script runs from project root.
cd "$(dirname "$0")/.."

# NOTE:
# This file is intended to be safe for public repos.
# Do NOT hardcode server IP/domain/secrets here.
#
# Example:
#   LEAFTAB_SERVER_IP="1.2.3.4" \
#   LEAFTAB_PUBLIC_ORIGIN="https://example.com" \
#   bash scripts/deploy-my-server.sh
#
# Optional:
#   LEAFTAB_SERVER_USER (default: root)
#   LEAFTAB_BACKEND_REMOTE_DIR (default: /var/www/leaftab-server)

require_env() {
  local key="$1"
  if [ -z "${!key:-}" ]; then
    echo "Missing required env: ${key}"
    exit 1
  fi
}

require_env "LEAFTAB_SERVER_IP"
require_env "LEAFTAB_PUBLIC_ORIGIN"

# Optional defaults you can override when needed:
# export LEAFTAB_SERVER_USER="${LEAFTAB_SERVER_USER:-root}"
# export LEAFTAB_BACKEND_REMOTE_DIR="${LEAFTAB_BACKEND_REMOTE_DIR:-/var/www/leaftab-server}"

bash scripts/deploy.sh "$@"
