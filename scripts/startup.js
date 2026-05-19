require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOG = (tag, msg) => console.log(`\x1b[36m[${tag}]\x1b[0m ${msg}`);
const ERR = (tag, msg) => console.log(`\x1b[31m[${tag}]\x1b[0m ${msg}`);
const OK = (tag, msg) => console.log(`\x1b[32m[${tag}]\x1b[0m ${msg}`);

let apiProcess = null;
let dashboardProcess = null;

async function findAvailablePort(start) {
  const net = require('net');
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(start + 1));
    });
  });
}

function healthCheck(port, path = '/api/health', retries = 30, delay = 2000) {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { resolve({ ok: true, data: JSON.parse(data) }); }
          catch { resolve({ ok: true, data: null }); }
        });
      });
      req.on('error', () => {
        if (attempts >= retries) resolve({ ok: false });
        else {
          process.stdout.write('.');
          setTimeout(check, delay);
        }
      });
      req.setTimeout(3000, () => { req.destroy(); });
    };
    check();
  });
}

function startAPI(port) {
  return new Promise((resolve) => {
    LOG('API', `Starting API server on port ${port}...`);
    const env = { ...process.env, API_PORT: String(port) };
    apiProcess = spawn('node', ['server.js'], {
      cwd: path.join(ROOT, 'api'),
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    apiProcess.stdout.on('data', (d) => process.stdout.write(`  \x1b[90m[API]\x1b[0m ${d}`));
    apiProcess.stderr.on('data', (d) => process.stderr.write(`  \x1b[31m[API]\x1b[0m ${d}`));
    apiProcess.on('error', (e) => { ERR('API', `Failed to start: ${e.message}`); resolve(false); });
    apiProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        ERR('API', `Crashed (code ${code}). Restarting in 3s...`);
        setTimeout(() => startAPI(port).then(resolve), 3000);
      }
    });
    resolve(true);
  });
}

function startDashboard(port, apiPort) {
  return new Promise((resolve) => {
    LOG('DASHBOARD', `Starting dashboard on port ${port}...`);
    const env = {
      ...process.env,
      PORT: String(port),
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}`,
    };
    dashboardProcess = spawn('npx', ['next', 'start', '-p', String(port)], {
      cwd: path.join(ROOT, 'dashboard'),
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
    dashboardProcess.stdout.on('data', (d) => process.stdout.write(`  \x1b[90m[DASH]\x1b[0m ${d}`));
    dashboardProcess.stderr.on('data', (d) => process.stderr.write(`  \x1b[31m[DASH]\x1b[0m ${d}`));
    dashboardProcess.on('error', (e) => { ERR('DASHBOARD', `Failed: ${e.message}`); resolve(false); });
    dashboardProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        ERR('DASHBOARD', `Crashed (code ${code}). Restarting in 3s...`);
        setTimeout(() => startDashboard(port, apiPort).then(resolve), 3000);
      }
    });
    resolve(true);
  });
}

function cleanup() {
  console.log('\n');
  LOG('SYSTEM', 'Shutting down...');
  if (apiProcess) { apiProcess.kill(); apiProcess = null; }
  if (dashboardProcess) { dashboardProcess.kill(); dashboardProcess = null; }
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', (e) => ERR('SYSTEM', `Fatal: ${e.message}`));

async function main() {
  console.log('\x1b[36m╔══════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║     🛡️  Nexus Security System        ║\x1b[0m');
  console.log('\x1b[36m║     Startup Manager v2.0             ║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════╝\x1b[0m\n');

  const API_PORT = parseInt(process.env.API_PORT) || 3001;
  const DASH_PORT = parseInt(process.env.DASH_PORT) || 3000;

  LOG('PORTS', 'Checking port availability...');
  const actualApiPort = await findAvailablePort(API_PORT);
  const actualDashPort = await findAvailablePort(DASH_PORT);

  if (actualApiPort !== API_PORT) {
    LOG('PORTS', `API port ${API_PORT} in use, using ${actualApiPort}`);
    process.env.API_PORT = String(actualApiPort);
  }
  if (actualDashPort !== DASH_PORT) {
    LOG('PORTS', `Dashboard port ${DASH_PORT} in use, using ${actualDashPort}`);
    process.env.DASH_PORT = String(actualDashPort);
  }
  OK('PORTS', `API: ${actualApiPort}, Dashboard: ${actualDashPort}`);

  LOG('SEQ', 'Starting API server...');
  await startAPI(actualApiPort);

  LOG('SEQ', 'Waiting for API health check...');
  const health = await healthCheck(actualApiPort, '/api/health', 20, 2000);
  if (health.ok) {
    OK('API', `Online — Bot: ${health.data?.bot || 'N/A'}, Servers: ${health.data?.servers || 0}`);
  } else {
    ERR('API', 'Not responding after 40s. Starting dashboard anyway...');
  }

  LOG('SEQ', 'Starting Next.js dashboard...');
  await startDashboard(actualDashPort, actualApiPort);

  LOG('SEQ', 'Waiting for dashboard health check...');
  const dashHealth = await healthCheck(actualDashPort, '/', 15, 2000);
  if (dashHealth.ok) {
    OK('DASHBOARD', 'Dashboard is responding');
  } else {
    ERR('DASHBOARD', 'Not responding after 30s. May still be compiling...');
  }

  console.log('\n\x1b[32m╔══════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[32m║     ✅ SYSTEM IS RUNNING              ║\x1b[0m');
  console.log('\x1b[32m╠══════════════════════════════════════╣\x1b[0m');
  console.log(`\x1b[32m║  API:      http://localhost:${actualApiPort}      ║\x1b[0m`);
  console.log(`\x1b[32m║  Dashboard: http://localhost:${actualDashPort}     ║\x1b[0m`);
  console.log(`\x1b[32m║  Health:    http://localhost:${actualApiPort}/api/health ║\x1b[0m`);
  console.log('\x1b[32m╚══════════════════════════════════════╝\x1b[0m\n');
  LOG('SYSTEM', 'Press Ctrl+C to stop all services');
}

main().catch((e) => {
  ERR('SYSTEM', `Startup failed: ${e.message}`);
  cleanup();
});
