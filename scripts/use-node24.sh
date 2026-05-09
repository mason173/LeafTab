#!/usr/bin/env bash
set -euo pipefail

NODE24_HOME="${NODE24_HOME:-/Users/matpool/nodejs/node-v24.14.0-darwin-arm64}"

if [ ! -x "$NODE24_HOME/bin/node" ]; then
  echo "Node 24 not found at $NODE24_HOME/bin/node" >&2
  exit 1
fi

export PATH="$NODE24_HOME/bin:$PATH"
exec "$@"
