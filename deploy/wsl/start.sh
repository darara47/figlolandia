#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

load_deploy_config
require_pm2
validate_tunnel_config
require_cloudflared_if_needed
ensure_logs_dir

cd "${PROJECT_ROOT}"

echo "Starting Figlolandia staging..."

start_pm2_process "figlolandia"
start_pm2_process "cloudflared"

echo ""
"${SCRIPT_DIR}/status.sh"
