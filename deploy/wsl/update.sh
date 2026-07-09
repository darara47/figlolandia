#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

require_pm2

cd "${PROJECT_ROOT}"

echo "Updating Figlolandia staging..."

git reset --hard HEAD
git pull
pnpm install
pnpm build
chmod +x deploy/wsl/*.sh
pm2 restart figlolandia --update-env || true

echo ""
"${SCRIPT_DIR}/status.sh"
