import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readEnv, serviceRunning, validPort } from "./dev-services.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const config = { ...readEnv(path.join(root, ".env")), ...readEnv(path.join(webDir, ".env")), ...readEnv(path.join(webDir, ".env.local")), ...process.env };
async function main() {
  const port = validPort(config.WEB_PORT ?? 3002, "WEB_PORT");
  if (await serviceRunning("web", port)) { console.log(`FlowForge web is already running at http://localhost:${port}. Reusing it; no duplicate server was started.`); return; }
  const require = createRequire(path.join(webDir, "package.json"));
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--port", String(port), ...process.argv.slice(2)], {
    cwd: webDir, stdio: "inherit", windowsHide: true,
    env: { ...process.env, API_INTERNAL_URL: config.API_INTERNAL_URL ?? `http://127.0.0.1:${validPort(config.API_PORT ?? 3001, "API_PORT")}` },
  });
  const stop = () => {
    if (child.exitCode !== null || !child.pid) return;
    if (process.platform === "win32") spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    else child.kill("SIGTERM");
  };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
