const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) {
    return env;
  }

  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

function loadDeployConfig() {
  const deployDir = path.join(__dirname, 'deploy');

  return {
    ...loadEnvFile(path.join(deployDir, 'config.env')),
    ...loadEnvFile(path.join(deployDir, 'config.local.env')),
  };
}

function getCloudflaredConfig(deployConfig) {
  const appPort = deployConfig.APP_PORT || '3008';
  const domain = (deployConfig.DOMAIN || '').trim();
  const tunnelToken = (deployConfig.CLOUDFLARE_TUNNEL_TOKEN || '').trim();

  if (tunnelToken) {
    return {
      enabled: true,
      args: ['tunnel', 'run', '--token', tunnelToken],
    };
  }

  if (!domain) {
    return {
      enabled: true,
      args: ['tunnel', '--url', `http://127.0.0.1:${appPort}`],
    };
  }

  return {
    enabled: false,
    reason:
      `DOMAIN is set to "${domain}" but CLOUDFLARE_TUNNEL_TOKEN is missing. ` +
      'Add the token to deploy/config.local.env or clear DOMAIN for quick tunnel mode.',
  };
}

const deployConfig = loadDeployConfig();
const appPort = deployConfig.APP_PORT || '3008';
const cloudflaredConfig = getCloudflaredConfig(deployConfig);
const logsDir = path.join(__dirname, 'deploy', 'logs');

const apps = [
  {
    name: 'figlolandia',
    cwd: __dirname,
    script: 'pnpm',
    args: 'start:prod',
    interpreter: 'none',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    env: {
      NODE_ENV: 'production',
      PORT: appPort,
      HOST: deployConfig.HOST || '0.0.0.0',
    },
    error_file: path.join(logsDir, 'figlolandia-error.log'),
    out_file: path.join(logsDir, 'figlolandia-out.log'),
    merge_logs: true,
    time: true,
  },
];

if (cloudflaredConfig.enabled) {
  apps.push({
    name: 'cloudflared',
    script: 'cloudflared',
    args: cloudflaredConfig.args.join(' '),
    interpreter: 'none',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    error_file: path.join(logsDir, 'cloudflared-error.log'),
    out_file: path.join(logsDir, 'cloudflared-out.log'),
    merge_logs: true,
    time: true,
  });
}

module.exports = {
  deploy: deployConfig,
  cloudflared: cloudflaredConfig,
  apps,
};
