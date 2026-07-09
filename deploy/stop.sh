#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

require_pm2

echo "Stopping Figlolandia staging..."

if pm2_process_exists "figlolandia"; then
  pm2 stop figlolandia
else
  echo "Process figlolandia is not registered in PM2 — skipping."
fi

echo ""
pm2 list
