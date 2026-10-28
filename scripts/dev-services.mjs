import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import net from "node:net";

export const readEnv = (file) => existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};

export function validPort(value, name) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${name} must be a port between 1 and 65535.`);
  return port;
}

export async function portAvailable(port) {
  // Windows can allow a wildcard IPv6 probe while an IPv4 listener owns the
  // same number. Check both families, matching the actual Node/Nest listeners.
  for (const host of ["0.0.0.0", "::"]) {
    const available = await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE") resolve(false);
        else if (error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL") resolve(true);
        else reject(error);
      });
      server.listen({ port, host, exclusive: true }, () => server.close(() => resolve(true)));
    });
    if (!available) return false;
  }
  return true;
}

export async function serviceRunning(kind, port) {
  if (await portAvailable(port)) return false;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${kind === "API" ? "/api/health" : "/"}`, { signal: AbortSignal.timeout(8000) });
    const matches = response.ok && (kind === "API" ? (await response.json()).service === "api" : (await response.text()).includes("<title>FlowForge AI</title>"));
    if (matches) return true;
  } catch { /* Occupied ports are never stopped automatically. */ }
  throw new Error(`${kind} port ${port} is occupied by another or unresponsive service. Stop its owning terminal or choose another port. No process was terminated.`);
}
