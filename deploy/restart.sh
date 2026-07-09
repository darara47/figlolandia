#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

load_deploy_config
require_pm2
ensure_logs_dir

cd "${PROJECT_ROOT}"

echo "Restarting Figlolandia application..."

if pm2_process_exists "figlolandia"; then
  pm2 restart figlolandia --update-env
else
  pm2 start "${ECOSYSTEM_FILE}" --only figlolandia --update-env
fi

echo ""
"${SCRIPT_DIR}/status.sh"
