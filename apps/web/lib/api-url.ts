/**
 * Resolve the API base URL while keeping the Nest `/api` prefix consistent
 * across same-origin proxy requests and direct browser-to-API requests.
 */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (!configured) return "/api";
  return configured.endsWith("/api") ? configured : `${configured}/api`;
}
