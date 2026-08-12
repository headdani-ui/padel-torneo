import { spawn } from 'child_process';
import http from 'http';

// Start Next.js server
const nextProcess = spawn('bun', ['run', 'dev'], {
  cwd: '/home/z/my-project',
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

nextProcess.stdout.on('data', (d) => process.stdout.write(d));
nextProcess.stderr.on('data', (d) => process.stderr.write(d));

nextProcess.on('exit', (code, signal) => {
  console.log(`Server exited: code=${code}, signal=${signal}`);
  // Restart
  setTimeout(() => process.exit(1), 1000);
});

// Keepalive HTTP server on 3001
const keepalive = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('keepalive');
});
keepalive.listen(3001, () => console.log('Keepalive on 3001'));

// Ping Next.js to keep it warm
setInterval(() => {
  http.get('http://localhost:3000/', () => {}).on('error', () => {});
}, 15000);
