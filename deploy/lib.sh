#!/usr/bin/env bash

set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${DEPLOY_DIR}/.." && pwd)"
LOGS_DIR="${DEPLOY_DIR}/logs"
ECOSYSTEM_FILE="${PROJECT_ROOT}/ecosystem.config.js"

load_deploy_config() {
  set -a
  # shellcheck disable=SC1091
  source "${DEPLOY_DIR}/config.env"
  if [[ -f "${DEPLOY_DIR}/config.local.env" ]]; then
    # shellcheck disable=SC1091
    source "${DEPLOY_DIR}/config.local.env"
  fi
  set +a

  APP_PORT="${APP_PORT:-3008}"
  HOST="${HOST:-0.0.0.0}"
  DOMAIN="${DOMAIN:-}"
  CLOUDFLARE_TUNNEL_TOKEN="${CLOUDFLARE_TUNNEL_TOKEN:-}"
}

ensure_logs_dir() {
  mkdir -p "${LOGS_DIR}"
}

pm2_process_exists() {
  local process_name="$1"
  pm2 pid "${process_name}" >/dev/null 2>&1
}

start_pm2_process() {
  local process_name="$1"

  if pm2_process_exists "${process_name}"; then
    pm2 restart "${process_name}" --update-env
  else
    pm2 start "${ECOSYSTEM_FILE}" --only "${process_name}" --update-env
  fi
}

validate_tunnel_config() {
  local domain_trimmed="${DOMAIN// /}"
  local token_trimmed="${CLOUDFLARE_TUNNEL_TOKEN// /}"

  if [[ -n "${domain_trimmed}" && -z "${token_trimmed}" ]]; then
    echo "ERROR: DOMAIN is set to \"${DOMAIN}\" but CLOUDFLARE_TUNNEL_TOKEN is missing." >&2
    echo "Add CLOUDFLARE_TUNNEL_TOKEN to deploy/config.local.env" >&2
    echo "or clear DOMAIN in deploy/config.env to use quick tunnel (trycloudflare.com)." >&2
    exit 1
  fi
}

require_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "ERROR: pm2 is not installed or not in PATH." >&2
    exit 1
  fi
}

require_cloudflared_if_needed() {
  local domain_trimmed="${DOMAIN// /}"
  local token_trimmed="${CLOUDFLARE_TUNNEL_TOKEN// /}"

  if [[ -z "${domain_trimmed}" || -n "${token_trimmed}" ]]; then
    if ! command -v cloudflared >/dev/null 2>&1; then
      echo "ERROR: cloudflared is not installed or not in PATH." >&2
      exit 1
    fi
  fi
}
