import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readEnv, serviceRunning, validPort } from "./dev-services.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Start the services with npm run dev:all.");
const config = { ...readEnv(path.join(root, "apps/api/.env")), ...readEnv(path.join(root, ".env")), ...process.env };
const apiPort = validPort(config.API_PORT ?? 3001, "API_PORT");
const webPort = validPort(process.env.WEB_PORT ?? readEnv(path.join(root, "apps/web/.env.local")).WEB_PORT ?? 3002, "WEB_PORT");
const apiRunning = await serviceRunning("API", apiPort);
const webRunning = await serviceRunning("web", webPort);
if (apiRunning) console.log(`Reusing FlowForge API at http://localhost:${apiPort}.`);
if (webRunning) console.log(`Reusing FlowForge web at http://localhost:${webPort}.`);
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
for (const script of [...(apiRunning ? [] : ["dev:api"]), ...(webRunning ? [] : ["dev"])]) {
  const child = spawn(process.execPath, [npm, "run", script], { cwd: root, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  children.push(child);
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => process.stdout.write(`[${script}] ${chunk}`));
  child.on("error", (error) => { console.error(`${script}: ${error.message}`); stop(1); });
  child.on("exit", (code) => { if (!stopping) { console.error(`${script} stopped. Shutting down the other development services.`); stop(code ?? 1); } });
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
console.log(`FlowForge: web http://localhost:${webPort} · API :${apiPort}. Existing services are reused; Ctrl+C stops only services started by this launcher.`);
