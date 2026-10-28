/** Public application origins, independent of the API's internal listen port. */
export function frontendOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return (env.WEB_ORIGIN?.split(",")[0]?.trim() || env.FRONTEND_URL?.trim() || "http://localhost:3002").replace(/\/+$/, "");
}

export function oauthCallbackUrl(provider: "github" | "google", env: NodeJS.ProcessEnv = process.env): string {
  const configured = env[`${provider.toUpperCase()}_CALLBACK_URL`]?.trim();
  return configured || new URL(`/api/auth/${provider}/callback`, frontendOrigin(env)).href;
}
