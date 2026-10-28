import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { serviceRunning, validPort } from "./dev-services.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "apps/api");
const readEnv = (file) => existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
// Match Nest's precedence without copying API/root provider keys into Python's environment.
const config = { ...readEnv(path.join(apiDir, ".env")), ...readEnv(path.join(root, ".env")), ...process.env };
const children = [];
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    if (process.platform === "win32") spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    else child.kill("SIGTERM");
  }
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

function launch(args, options = {}) {
  const child = spawn(process.execPath, args, { stdio: "inherit", windowsHide: true, ...options });
  children.push(child);
  child.on("error", (error) => { console.error(error.message); stop(1); });
  child.on("exit", (code) => { if (!stopping) { console.error("A development service stopped; stopping its companion processes."); stop(code || 1); } });
  return child;
}

async function healthy(base) {
  try {
    const response = await fetch(`${base}/ai/health`, { signal: AbortSignal.timeout(1500) });
    return response.ok && (await response.json()).service === "ai";
  } catch { return false; }
}

async function main() {
  const port = validPort(config.API_PORT ?? 3001, "API_PORT");
  if (await serviceRunning("API", port)) {
    console.log(`FlowForge API is already running at http://localhost:${port}. Reusing it; no duplicate server was started.`);
    return;
  }
  const base = (config.AI_SERVICE_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
  if (config.START_LOCAL_AI !== "false") {
    const url = new URL(base);
    if (!(await healthy(base))) {
      if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/") {
        throw new Error(`AI service at ${base} is unreachable. Start the configured remote service before starting the API.`);
      }
      console.log(`AI service is not running. Starting the local Python service at ${base}…`);
      launch([path.join(root, "scripts/ai.mjs"), "dev"], { cwd: root, env: { ...process.env, AI_PORT: url.port || "80" } });
      const deadline = Date.now() + 30000;
      while (!stopping && Date.now() < deadline && !(await healthy(base))) await new Promise((resolve) => setTimeout(resolve, 250));
      if (stopping) return;
      if (!(await healthy(base))) throw new Error("AI service did not become ready. Check the Python startup error above or run npm run dev:ai.");
    } else {
      console.log(`Reusing the running AI service at ${base}.`);
    }
    if (!config.AI_SERVICE_SECRET) throw new Error("Set AI_SERVICE_SECRET in the API/root and AI environment files.");
    const checked = await fetch(`${base}/ai/configuration`, { headers: { "X-AI-Service-Secret": config.AI_SERVICE_SECRET }, signal: AbortSignal.timeout(5000) });
    if (checked.status === 401) throw new Error("AI_SERVICE_SECRET must match in the API/root and AI environment files. Restart the AI service after correcting it.");
    if (!checked.ok) throw new Error("The AI service configuration endpoint is unavailable. Restart it with npm run dev:ai.");
    console.log("AI service is ready. Starting Nest watch mode.");
  }
  const require = createRequire(path.join(apiDir, "package.json"));
  launch([require.resolve("@nestjs/cli/bin/nest.js"), "start", "--watch"], { cwd: apiDir, env: { ...process.env, AI_SERVICE_URL: base } });
}
main().catch((error) => { console.error(error.message); stop(1); });
