import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cwd = path.join(root, "apps", "ai");
const python = path.join(cwd, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
if (!existsSync(python)) {
  console.error("AI virtual environment missing. See docs/implementation/local-development.md to install it.");
  process.exit(1);
}
const args = process.argv[2] === "test"
  ? ["-m", "unittest", "discover", "-s", "tests", "-v"]
  : ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", process.env.AI_PORT ?? "8000"];
const child = spawn(python, args, { cwd, stdio: "inherit", windowsHide: true });
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
