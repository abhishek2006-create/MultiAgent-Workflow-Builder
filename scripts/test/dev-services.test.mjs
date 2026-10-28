import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { validPort, serviceRunning, portAvailable } from "../dev-services.mjs";

async function serverFor(handler, operation) {
  const server = http.createServer(handler);
  server.listen(0, "0.0.0.0"); await once(server, "listening");
  try { await operation(server.address().port); }
  finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}

test("invalid ports are rejected before a service is launched", () => {
  for (const value of [0, 65536, "not-a-port", 1.5]) assert.throws(() => validPort(value, "API_PORT"), /API_PORT must/);
  assert.equal(validPort("3101", "API_PORT"), 3101);
});

test("a running API is reused instead of launching a competing listener", async () => {
  await serverFor((req, res) => { assert.equal(req.url, "/api/health"); res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ service: "api", status: "ok" })); }, async (port) => {
    assert.equal(await portAvailable(port), false);
    assert.equal(await serviceRunning("API", port), true);
  });
});

test("a FlowForge frontend is reused", async () => {
  await serverFor((_req, res) => res.end("<html><title>FlowForge AI</title></html>"), async (port) => {
    assert.equal(await serviceRunning("web", port), true);
  });
});

test("an unrelated application is preserved and reported without being killed", async () => {
  await serverFor((_req, res) => res.end("<html><title>Other application</title></html>"), async (port) => {
    await assert.rejects(serviceRunning("web", port), /occupied by another or unresponsive service/);
    assert.equal((await fetch(`http://127.0.0.1:${port}`)).status, 200);
  });
});

test("non-API responses cannot be reused as the backend", async () => {
  await serverFor((_req, res) => res.end("not an API"), async (port) => {
    await assert.rejects(serviceRunning("API", port), /No process was terminated/);
  });
});
