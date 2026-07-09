#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

load_deploy_config
require_pm2

echo "=== PM2 status ==="
pm2 list

echo ""
echo "=== figlolandia ==="
if pm2_process_exists "figlolandia"; then
  pm2 show figlolandia | sed -n '1,20p'
  echo "Local URL: http://127.0.0.1:${APP_PORT}"
else
  echo "Process not registered."
fi
