#!/bin/bash

set -e

# Ensure this script runs from project root.
cd "$(dirname "$0")/.."

# Personal defaults for this server. Can still be overridden by env vars.
export LEAFTAB_SERVER_IP="${LEAFTAB_SERVER_IP:-83.229.123.206}"
export LEAFTAB_PUBLIC_ORIGIN="${LEAFTAB_PUBLIC_ORIGIN:-https://www.leaftab.cc}"

# Optional defaults you can override when needed:
# export LEAFTAB_SERVER_USER="${LEAFTAB_SERVER_USER:-root}"
# export LEAFTAB_BACKEND_REMOTE_DIR="${LEAFTAB_BACKEND_REMOTE_DIR:-/var/www/leaftab-server}"

bash scripts/deploy.sh "$@"
