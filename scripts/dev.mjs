import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Start the services with npm run dev:all.");
for (const [name, port] of [["web", 3002], ["API", Number(process.env.API_PORT ?? 3001)]]) {
  await new Promise((resolve, reject) => {
    const check = net.createServer();
    check.once("error", () => reject(new Error(`${name} port ${port} is unavailable. Stop the existing server before starting another copy.`)));
    check.listen(port, "127.0.0.1", () => check.close(resolve));
  });
}
const children = [];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === "win32") spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    else child.kill("SIGTERM");
  }
}
for (const script of ["dev:api", "dev"]) {
  const child = spawn(process.execPath, [npm, "run", script], { cwd: root, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  children.push(child);
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => process.stdout.write(`[${script}] ${chunk}`));
  child.on("error", (error) => { console.error(`${script}: ${error.message}`); stop(1); });
  child.on("exit", (code) => { if (!stopping) { console.error(`${script} stopped. Shutting down the other development services.`); stop(code ?? 1); } });
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
console.log("Starting FlowForge: web http://localhost:3002 · API :3001 · AI :8000. Docker Desktop must be running. Ctrl+C stops these development services.");
