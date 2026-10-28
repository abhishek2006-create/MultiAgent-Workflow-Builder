const test = require("node:test");
const assert = require("node:assert/strict");
const { frontendOrigin, oauthCallbackUrl } = require("../dist/src/auth/oauth-urls.js");
const { AuthController } = require("../dist/src/auth/auth.controller.js");

test("local OAuth returns through FlowForge's proxy rather than another app's API port", () => {
  const env = { API_PORT: "3101", WEB_ORIGIN: "http://localhost:3002" };
  assert.equal(oauthCallbackUrl("github", env), "http://localhost:3002/api/auth/github/callback");
  assert.equal(oauthCallbackUrl("google", env), "http://localhost:3002/api/auth/google/callback");
  assert.equal(oauthCallbackUrl("github", {}), "http://localhost:3002/api/auth/github/callback");
});

test("production callback configuration is preserved and post-login origin is deterministic", () => {
  const env = { WEB_ORIGIN: "https://flow.example/,https://preview.example", GITHUB_CALLBACK_URL: "https://api.example/api/auth/github/callback" };
  assert.equal(oauthCallbackUrl("github", env), env.GITHUB_CALLBACK_URL);
  assert.equal(frontendOrigin(env), "https://flow.example");
  assert.equal(frontendOrigin({ FRONTEND_URL: "https://legacy.example/" }), "https://legacy.example");
});

test("successful GitHub and Google sign-ins open the public landing page", async () => {
  const previous = process.env.WEB_ORIGIN;
  process.env.WEB_ORIGIN = "http://localhost:3002";
  try {
    const controller = new AuthController({ validateOAuthUser: async () => ({ access_token: "test-session" }) });
    for (const provider of ["github", "google"]) {
      let destination;
      let cookie;
      const res = { cookie: (name, value) => { cookie = [name, value]; }, redirect: (url) => { destination = url; } };
      await controller[`${provider}Callback`]({ user: { provider, subject: "123", email: "test@example.test" } }, res);
      assert.deepEqual(cookie, ["access_token", "test-session"]);
      assert.equal(destination, "http://localhost:3002/");
    }
  } finally {
    if (previous === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = previous;
  }
});
