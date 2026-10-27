// Real PostgreSQL and Nest HTTP/worker integration. AI is mocked unless --live-ai is supplied.
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { existsSync } = require("node:fs");
const environmentFile = path.resolve(__dirname, "../.env");
if (existsSync(environmentFile)) process.loadEnvFile(environmentFile);

const live = process.argv.includes("--live-ai");
const origin = "http://localhost:3002";
const runId = randomUUID();
const admin = new PrismaClient();
const schema = `flowforge_smoke_${runId.replaceAll("-", "")}`;
let prisma;
let schemaCreated = false;
const fixtures = [];
const calls = [];
let apiProcess;
let logs = "";
let failurePending = true;
let mock;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const node = (id, type, extra = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label: id, model: "gemini-3.5-flash-lite", timeoutMs: 60000, maxTokens: 1024, ...extra } });
const edge = (source, target, sourceHandle) => ({ id: `${source}-${target}`, source, target, ...(sourceHandle ? { sourceHandle } : {}) });

async function availablePort() {
  const server = http.createServer();
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function main() {
  // Every smoke run gets its own migrated schema, so its worker cannot claim
  // any queued jobs belonging to the development application's users.
  assert(/^flowforge_smoke_[a-f0-9]{32}$/.test(schema));
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  const database = new URL(process.env.DATABASE_URL);
  database.searchParams.set("schema", schema);
  const databaseUrl = database.toString();
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const migrate = spawn(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy", "--schema", path.resolve(__dirname, "../apps/api/prisma/schema.prisma")], { cwd: path.resolve(__dirname, ".."), env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "ignore", windowsHide: true });
  assert.equal((await once(migrate, "exit"))[0], 0, "Test schema migrations must succeed");
  const port = await availablePort();
  const base = `http://127.0.0.1:${port}/api`;
  let aiUrl = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";
  if (!live) {
    mock = http.createServer(async (req, res) => {
      if (req.headers["x-ai-service-secret"] !== process.env.AI_SERVICE_SECRET) { res.writeHead(401).end(); return; }
      res.setHeader("content-type", "application/json");
      if (req.url === "/ai/configuration") { res.end(JSON.stringify({ defaultModel: "gemini-3.5-flash-lite", providers: [{ name: "Gemini", configured: true, models: ["gemini-3.5-flash-lite"] }] })); return; }
      let body = ""; for await (const chunk of req) body += chunk;
      const input = JSON.parse(body); calls.push(input);
      if (req.url === "/ai/search") {
        res.end(JSON.stringify({ message: "A grounded test summary", intent: "web_search", needs_human: false, sources: ["https://example.com/source"], searchSources: [{ url: "https://example.com/source", title: "Fixture source" }], searchSuggestionsHtml: `<div>${"suggestions ".repeat(2000)}</div>` }));
        return;
      }
      const task = JSON.parse(input.customer_message ?? "{}");
      if (task.request?.simulateFailure && failurePending) { failurePending = false; res.writeHead(502).end(JSON.stringify({ detail: "Gemini provider request failed" })); return; }
      if (task.request?.delay) await wait(1500);
      res.end(JSON.stringify({ message: `Verified ${input.agent_type ?? "search"} result`, intent: input.agent_type ?? "web_search", needs_human: false, plan: ["Build", "Review"], research_findings: ["Source fact from the supplied request"], review_passed: true, usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 } }));
    });
    mock.listen(0, "127.0.0.1"); await once(mock, "listening");
    aiUrl = `http://127.0.0.1:${mock.address().port}`;
  }
  apiProcess = spawn(process.execPath, [path.resolve(__dirname, "../apps/api/dist/src/main.js")], {
    cwd: path.resolve(__dirname, ".."), env: { ...process.env, DATABASE_URL: databaseUrl, API_PORT: String(port), AI_SERVICE_URL: aiUrl, WEB_ORIGIN: origin, NODE_ENV: "development", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  apiProcess.stdout.on("data", (chunk) => { logs = (logs + chunk).slice(-12000); });
  apiProcess.stderr.on("data", (chunk) => { logs = (logs + chunk).slice(-12000); });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (apiProcess.exitCode !== null) throw new Error(`Smoke API exited before startup:\n${logs.slice(-5000)}`);
    try { if ((await fetch(`${base}/health/ready`)).ok) { ready = true; break; } } catch {}
    await wait(250);
  }
  assert(ready, "Smoke API must become ready");
  const request = async (route, method = "GET", body, cookie, expected = 200) => {
    const response = await fetch(`${base}${route}`, { method, headers: { origin, ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const value = await response.json();
    assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(value)}`);
    return { value, cookie: response.headers.get("set-cookie")?.split(";")[0] };
  };
  const register = async (suffix) => {
    const email = `smoke-${runId}-${suffix}@example.test`;
    const result = await request("/auth/register", "POST", { email, password: "Smoke-only-password-42!", organizationName: `Smoke ${runId} ${suffix}` }, undefined, 201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    fixtures.push(user);
    assert(result.cookie, "Registration must issue an HttpOnly session cookie");
    return result.cookie;
  };
  let owner = await register("owner");
  const stranger = await register("stranger");
  await request("/auth/me", "GET", undefined, owner);
  await request("/auth/me", "GET", undefined, undefined, 401);
  await request("/auth/google", "GET", undefined, undefined, 503);
  await request("/auth/github", "GET", undefined, undefined, 503);
  const config = await request("/ai/configuration", "GET", undefined, owner);
  assert.equal(config.value.available, true);
  const nodes = [node("input", "input"), ...["planner", "research", "coding", "reviewer"].map((role) => node(role, role === "reviewer" ? "reviewer" : "agent", { agentType: role, instructions: "Use the original task. Return a very brief result." })), node("approval", "approval"), node("output", "output")];
  const edges = [edge("input", "planner"), edge("planner", "research"), edge("planner", "coding"), edge("research", "reviewer"), edge("coding", "reviewer"), edge("reviewer", "approval"), edge("approval", "output")];
  const workflow = (await request("/workflows", "POST", { name: "Smoke multi-agent flow", nodes, edges }, owner, 201)).value;
  await request(`/workflows/${workflow.id}/validate`, "POST", {}, owner, 201);
  await request(`/workflows/${workflow.id}`, "GET", undefined, stranger, 404);
  await request(`/workflows/${workflow.id}/run`, "POST", { input: {} }, stranger, 404);
  const run = (await request(`/workflows/${workflow.id}/run`, "POST", { input: { request: "Plan a tiny order total calculator", source_material: "Total is price multiplied by quantity plus delivery." } }, owner, 201)).value;
  const detail = async (id) => (await request(`/workflows/${workflow.id}/executions/${id}`, "GET", undefined, owner)).value;
  const until = async (id, status, timeout = live ? 240000 : 20000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = await detail(id);
      if (value.status === status) return value;
      if (["COMPLETED", "FAILED", "CANCELLED"].includes(value.status)) throw new Error(`Expected ${status}, got ${value.status}: ${value.error}`);
      await wait(300);
    }
    throw new Error(`Execution did not reach ${status}`);
  };
  const paused = await until(run.executionId, "WAITING_APPROVAL");
  assert.equal(paused.steps.filter((step) => step.status === "COMPLETED").length, 5);
  const approval = paused.approvals.find((value) => value.status === "PENDING");
  assert(approval);
  await request(`/executions/${run.executionId}/approvals/${approval.id}/resolve`, "POST", { approved: true }, stranger, 404);
  await request(`/workflows/${workflow.id}`, "PATCH", { name: "Changed after execution started" }, owner);
  await request(`/executions/${run.executionId}/approvals/${approval.id}/resolve`, "POST", { approved: true }, owner, 201);
  const completed = await until(run.executionId, "COMPLETED");
  const metrics = (await request("/dashboard/overview", "GET", undefined, owner)).value;
  assert.equal(metrics.workflowCount, 1);
  assert.equal(metrics.executionCount, 1);
  assert.equal(metrics.statuses.COMPLETED, 1);
  assert.equal(metrics.successRate, 100);
  assert.equal(metrics.recentExecutions[0].id, run.executionId);
  assert(Number.isFinite(Date.parse(metrics.updatedAt)));
  if (!live) assert.equal(metrics.recentUsage.totalTokens, 80);
  const otherMetrics = (await request("/dashboard/overview", "GET", undefined, stranger)).value;
  assert.equal(otherMetrics.executionCount, 0);
  assert.equal(otherMetrics.workflowCount, 0);
  console.log("PASS live dashboard counts, persisted token usage and workspace isolation");
  assert.equal(completed.startedAt, paused.startedAt, "Resuming approval must preserve the original start time");
  assert.equal(completed.workflowVersion.version, 1, "An edited workflow must not change the pinned run version");
  assert.match(JSON.stringify(completed.output), /reviewer/);
  assert.match(JSON.stringify(completed.output), /approved/);
  const history = (await request(`/workflows/${workflow.id}/executions?limit=1`, "GET", undefined, owner)).value;
  assert.equal(history.items[0].id, run.executionId);
  console.log(`PASS ${live ? "LIVE AI" : "mock AI"}: register, session, workspace isolation, graph validation, parallel agents, approval, pinned version, final output, history`);
  if (!live) {
    assert(calls.filter((call) => call.agent_type === "research").every((call) => call.customer_message.includes("price multiplied")), "Research must receive the original context");
    const failed = (await request(`/workflows/${workflow.id}/run`, "POST", { input: { simulateFailure: true } }, owner, 201)).value;
    await until(failed.executionId, "FAILED");
    const retried = (await request(`/executions/${failed.executionId}/retry`, "POST", {}, owner, 201)).value;
    await until(retried.executionId, "WAITING_APPROVAL");
    await request(`/executions/${retried.executionId}/cancel`, "POST", {}, owner, 201);
    assert.equal((await detail(retried.executionId)).status, "CANCELLED");
    const savedVersion = await prisma.workflowVersion.findFirstOrThrow({ where: { workflowId: workflow.id }, orderBy: { version: "desc" } });
    const recoveredStartedAt = new Date(Date.now() - 120000);
    const recoveredInput = { request: "Resume a persisted workflow" };
    const abandoned = await prisma.workflowExecution.create({ data: {
      workflowId: workflow.id, workflowVersionId: savedVersion.id, triggeredById: fixtures[0].id, status: "RUNNING", startedAt: recoveredStartedAt, input: recoveredInput,
      workerLease: { create: { workerId: "expired-test-worker", leaseExpiresAt: new Date(Date.now() - 1000) } },
      steps: { create: { nodeId: "input", nodeType: "input", status: "COMPLETED", input: recoveredInput, output: recoveredInput, completedAt: recoveredStartedAt } },
    } });
    const resumed = await until(abandoned.id, "WAITING_APPROVAL");
    assert.equal(resumed.startedAt, recoveredStartedAt.toISOString());
    assert.equal(resumed.steps.filter((step) => step.nodeId === "input").length, 1);
    await request(`/executions/${abandoned.id}/cancel`, "POST", {}, owner, 201);
    console.log("PASS expired worker lease recovery preserves completed steps and original start time");
    const branchNodes = [node("input", "input"), node("condition", "condition", { conditionPath: "input.flag", conditionOperator: "truthy" }), node("approval", "approval"), node("calc", "tool", { toolKind: "calculator", expression: "1 + 2" }), node("output", "output")];
    const branchEdges = [edge("input", "condition"), edge("condition", "approval", "true"), edge("condition", "calc", "false"), edge("approval", "output"), edge("calc", "output")];
    await request(`/workflows/${workflow.id}`, "PATCH", { nodes: branchNodes, edges: branchEdges }, owner);
    const branch = (await request(`/workflows/${workflow.id}/run`, "POST", { input: { flag: false } }, owner, 201)).value;
    const finished = await until(branch.executionId, "COMPLETED");
    assert.equal(finished.steps.find((step) => step.nodeId === "approval").status, "SKIPPED");
    assert.equal(finished.approvals.length, 0);
    console.log("PASS mock AI: failure, retry, cancel, skipped approval branch and tool output");
    await request(`/workflows/${workflow.id}`, "PATCH", { nodes: [node("input", "input"), node("search", "tool", { toolKind: "web-search", inputPath: "input.query", maxResults: 3 }), node("research", "agent", { agentType: "research" }), node("output", "output")], edges: [edge("input", "search"), edge("search", "research"), edge("research", "output")] }, owner);
    const searched = (await request(`/workflows/${workflow.id}/run`, "POST", { input: { query: "a test query" } }, owner, 201)).value;
    const searchResult = await until(searched.executionId, "COMPLETED");
    assert.equal(searchResult.steps.find((step) => step.nodeId === "search").output.sources[0], "https://example.com/source");
    assert(calls.some((call) => call.query === "a test query"));
    const researchCall = calls.filter((call) => call.agent_type === "research").at(-1);
    assert(researchCall.customer_message.includes("https://example.com/source"));
    assert(!researchCall.customer_message.includes("searchSuggestionsHtml"), "Provider suggestion HTML must not be sent to downstream agents");
    console.log("PASS mock search: query mapping, source persistence, downstream research and bounded context");
  }
  const workspace = (await request("/workspaces", "POST", { name: "Second smoke workspace" }, owner, 201)).value;
  const oldOwner = owner;
  owner = (await request(`/auth/workspaces/${workspace.id}/switch`, "POST", {}, owner, 201)).cookie;
  assert(owner);
  await request("/auth/me", "GET", undefined, oldOwner, 401);
  assert.equal((await request("/auth/me", "GET", undefined, owner)).value.organizationId, workspace.id);
  assert.equal((await request("/workflows", "GET", undefined, owner)).value.length, 0);
  const invitation = (await request(`/workspaces/${workspace.id}/invitations`, "POST", { email: fixtures[1].email, role: "VIEWER" }, owner, 201)).value;
  await request("/workspaces/invitations/accept", "POST", { token: invitation.token }, stranger, 201);
  const viewer = (await request(`/auth/workspaces/${workspace.id}/switch`, "POST", {}, stranger, 201)).cookie;
  await request("/workflows", "POST", { name: "Denied viewer workflow", nodes, edges }, viewer, 403);
  owner = (await request(`/auth/workspaces/${fixtures[0].organizationId}/switch`, "POST", {}, owner, 201)).cookie;
  console.log("PASS workspace creation, invitation acceptance, switching, session rotation and viewer write protection");
  await request("/auth/logout", "POST", {}, owner, 201);
  await request("/auth/me", "GET", undefined, owner, 401);
  console.log("PASS logout revokes the session");
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (apiProcess && apiProcess.exitCode === null) { const closed = once(apiProcess, "exit"); apiProcess.kill(); await closed; }
  if (mock) { mock.closeAllConnections(); await new Promise((resolve) => mock.close(resolve)); }
  for (const user of fixtures) {
    await prisma.workflow.deleteMany({ where: { organizationId: user.organizationId } });
    await prisma.organization.delete({ where: { id: user.organizationId } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  if (prisma) await prisma.$disconnect();
  if (schemaCreated && /^flowforge_smoke_[a-f0-9]{32}$/.test(schema)) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.$disconnect();
  if (process.exitCode) console.error("Smoke failed; only the smoke fixtures were cleaned up. Inspect API/AI service logs for details.");
});
