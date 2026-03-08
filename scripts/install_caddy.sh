#!/bin/bash
set -e

echo ">>> Detecting OS..."
if [ -f /etc/debian_version ]; then
    echo ">>> Debian/Ubuntu detected. Installing Caddy..."
    apt-get update
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update
    apt-get install -y caddy
    echo ">>> Caddy installed successfully!"
else
    echo ">>> ERROR: Unsupported OS. Please install Caddy manually: https://caddyserver.com/docs/install"
    exit 1
fi
