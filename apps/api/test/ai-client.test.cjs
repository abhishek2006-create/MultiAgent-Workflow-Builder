const test = require("node:test");
const assert = require("node:assert/strict");
const { AiClientService } = require("../dist/src/ai/ai-client.service.js");

function client() {
  const values = { AI_SERVICE_URL: "http://ai:8000", AI_SERVICE_SECRET: "mock-only-secret" };
  return new AiClientService({ get: (key, fallback) => values[key] ?? fallback });
}

async function withResponse(status, payload, run) {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
  try {
    await run();
  } finally {
    global.fetch = originalFetch;
  }
}

test("forwards the selected GPT model to the AI service", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    assert.equal(JSON.parse(options.body).model, "gpt-5.5");
    return new Response(JSON.stringify({ message: "ok", intent: "support", needs_human: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await client().support({ customer_message: "test", model: "gpt-5.5" });
    assert.equal(result.message, "ok");
  } finally {
    global.fetch = originalFetch;
  }
});

test("explains when API and AI service shared secrets do not match", async () => {
  await withResponse(401, { detail: "AI service authentication failed" }, async () => {
    await assert.rejects(client().support({ customer_message: "test" }), /AI_SERVICE_SECRET match/);
  });
});

test("surfaces missing provider keys and unsupported model diagnostics safely", async () => {
  await withResponse(503, { detail: "Set GEMINI_API_KEY before calling the AI service" }, async () => {
    await assert.rejects(client().support({ customer_message: "test" }), /GEMINI_API_KEY/);
  });
  await withResponse(503, { detail: "The selected Gemini model is not in GEMINI_ALLOWED_MODELS" }, async () => {
    await assert.rejects(client().support({ customer_message: "test" }), /GEMINI_ALLOWED_MODELS/);
  });
  await withResponse(503, { detail: "Set OPENAI_API_KEY before selecting a GPT model" }, async () => {
    await assert.rejects(client().support({ customer_message: "test" }), /OPENAI_API_KEY/);
  });
  await withResponse(503, { detail: "The selected OpenAI model is not in OPENAI_ALLOWED_MODELS" }, async () => {
    await assert.rejects(client().support({ customer_message: "test" }), /OPENAI_ALLOWED_MODELS/);
  });
});

test("reports provider quota and error details without raw provider responses", async () => {
  await withResponse(429, { detail: "Gemini quota or rate limit was reached. Check Google AI Studio quota and retry later." }, async () => {
    await assert.rejects(client().support({ customer_message: "test" }), /quota or rate limit/);
  });
  await withResponse(429, { detail: "OpenAI quota or rate limit was reached. Check the provider quota and retry later." }, async () => {
    await assert.rejects(client().support({ customer_message: "test" }), /OpenAI quota or rate limit/);
  });
  await withResponse(502, { detail: "Gemini provider request failed (provider HTTP 500). Check provider availability and the AI service logs." }, async () => {
    await assert.rejects(client().support({ customer_message: "test" }), /provider HTTP 500/);
  });
  await withResponse(502, { detail: "raw key=do-not-forward" }, async () => {
    await assert.rejects(
      client().support({ customer_message: "test" }),
      (error) => {
        assert.match(error.message, /Check the AI service logs/);
        assert.doesNotMatch(error.message, /do-not-forward/);
        return true;
      },
    );
  });
});
