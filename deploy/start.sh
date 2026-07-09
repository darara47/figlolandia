#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

load_deploy_config
require_pm2
<<<<<<< HEAD
=======
validate_tunnel_config
require_cloudflared_if_needed
>>>>>>> ce136dd (Add deployment configuration and scripts for Figlolandia staging environment)
ensure_logs_dir

cd "${PROJECT_ROOT}"

echo "Starting Figlolandia staging..."
start_pm2_process "figlolandia"
<<<<<<< HEAD
=======
start_pm2_process "cloudflared"
>>>>>>> ce136dd (Add deployment configuration and scripts for Figlolandia staging environment)

echo ""
"${SCRIPT_DIR}/status.sh"
