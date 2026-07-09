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
<<<<<<< HEAD
=======

echo ""
echo "=== cloudflared ==="
if pm2_process_exists "cloudflared"; then
  pm2 show cloudflared | sed -n '1,20p'

  domain_trimmed="${DOMAIN// /}"
  token_trimmed="${CLOUDFLARE_TUNNEL_TOKEN// /}"

  if [[ -n "${domain_trimmed}" && -n "${token_trimmed}" ]]; then
    echo "Public URL: https://${DOMAIN}"
  else
    tunnel_url="$(
      pm2 logs cloudflared --lines 200 --nostream 2>/dev/null \
        | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' \
        | tail -n 1 \
        || true
    )"

    if [[ -n "${tunnel_url}" ]]; then
      echo "Quick tunnel URL: ${tunnel_url}"
    else
      echo "Quick tunnel URL: not found yet — check: pm2 logs cloudflared"
    fi
  fi
else
  echo "Process not registered."
fi
>>>>>>> ce136dd (Add deployment configuration and scripts for Figlolandia staging environment)
