#!/usr/bin/env bash

set -euo pipefail

WSL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${WSL_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${DEPLOY_DIR}/.." && pwd)"
CONFIG_DIR="${DEPLOY_DIR}/config"
LOGS_DIR="${DEPLOY_DIR}/logs"
ECOSYSTEM_FILE="${PROJECT_ROOT}/ecosystem.config.js"

ensure_runtime_path() {
  if [[ -n "${FIGLOLANDIA_RUNTIME_PATH_READY:-}" ]]; then
    return
  fi

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    . "${NVM_DIR}/nvm.sh"
  fi

  export FIGLOLANDIA_RUNTIME_PATH_READY=1
}

ensure_runtime_path

load_deploy_config() {
  set -a
  # shellcheck disable=SC1091
  source "${CONFIG_DIR}/config.env"
  if [[ -f "${CONFIG_DIR}/config.local.env" ]]; then
    # shellcheck disable=SC1091
    source "${CONFIG_DIR}/config.local.env"
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

pm2_process_registered() {
  local process_name="$1"
  pm2 describe "${process_name}" >/dev/null 2>&1
}

# Backward-compatible alias used by stop/status scripts.
pm2_process_exists() {
  pm2_process_registered "$1"
}

pm2_summary_status() {
  local process_name="$1"

  if ! pm2_process_exists "${process_name}"; then
    echo "${process_name} not registered"
    return
  fi

  local status
  status="$(
    pm2 jlist 2>/dev/null | node -e "
      const list = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      const proc = list.find((item) => item.name === process.argv[1]);
      process.stdout.write(proc ? proc.pm2_env.status : 'not registered');
    " "${process_name}"
  )"
  echo "${process_name} ${status}"
}

start_pm2_process() {
  local process_name="$1"

  if pm2_process_registered "${process_name}"; then
    pm2 restart "${process_name}" --update-env
  else
    pm2 start "${ECOSYSTEM_FILE}" --update-env
  fi
}

validate_tunnel_config() {
  local domain_trimmed="${DOMAIN// /}"
  local token_trimmed="${CLOUDFLARE_TUNNEL_TOKEN// /}"

  if [[ -n "${domain_trimmed}" && -z "${token_trimmed}" ]]; then
    echo "ERROR: DOMAIN is set to \"${DOMAIN}\" but CLOUDFLARE_TUNNEL_TOKEN is missing." >&2
    echo "Add CLOUDFLARE_TUNNEL_TOKEN to deploy/config/config.local.env" >&2
    echo "or clear DOMAIN in deploy/config/config.env to use quick tunnel (trycloudflare.com)." >&2
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
