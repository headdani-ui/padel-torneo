import { spawn } from "child_process";
import http from "http";

const NEXT_DIR = "/home/z/my-project";

// Start Next.js dev server
const next = spawn("bun", ["run", "dev"], {
  cwd: NEXT_DIR,
  env: { ...process.env },
  stdio: ["pipe", "pipe", "pipe"],
});

next.stdout.on("data", (d: Buffer) => process.stdout.write(d));
next.stderr.on("data", (d: Buffer) => process.stderr.write(d));

next.on("exit", () => {
  console.log("Next.js exited, restarting...");
  setTimeout(() => process.exit(42), 1000);
});

// Health check keepalive
setInterval(() => {
  http
    .get("http://localhost:3000/", () => {})
    .on("error", () => {});
}, 8000);

// Small keepalive HTTP server to stay alive
const alive = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("padel-server alive");
});

alive.listen(3099, () => {
  console.log("Padel server keepalive on 3099");
});
