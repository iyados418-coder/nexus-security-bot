const { spawn } = require('child_process');
const path = require('path');

const dashDir = path.resolve(__dirname, '..', 'dashboard');
const nextBin = path.join(dashDir, 'node_modules', '.bin', 'next.cmd');

console.log(`\x1b[36m[Dashboard] Starting Next.js dev server...\x1b[0m`);

const child = spawn(nextBin, ['dev', '-p', '3000', '-H', '0.0.0.0'], {
  cwd: dashDir,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  console.error(`\x1b[31m[Dashboard] Failed to start: ${err.message}\x1b[0m`);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\x1b[31m[Dashboard] Exited with code ${code}\x1b[0m`);
  }
  process.exit(code || 0);
});