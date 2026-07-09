#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

require_pm2

echo "Stopping Figlolandia staging..."

for process_name in figlolandia cloudflared; do
  if pm2_process_exists "${process_name}"; then
    pm2 stop "${process_name}"
  else
    echo "Process ${process_name} is not registered in PM2 — skipping."
  fi
done

echo ""
pm2 list
