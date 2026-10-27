const MAX_NODE_RETRIES = 3;

export function configuredNodeRetries(data: Record<string, unknown> | undefined): number {
  const value = data?.maxRetries;
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= MAX_NODE_RETRIES
    ? Number(value)
    : 0;
}

export function isRetryableNodeError(error: unknown, nodeType: string): boolean {
  if (!["agent", "llm", "reviewer"].includes(nodeType) || !error || typeof error !== "object") return false;
  const candidate = error as { getStatus?: () => number; message?: string };
  const status = typeof candidate.getStatus === "function" ? candidate.getStatus() : undefined;
  if (status === 502 || status === 504) return true;
  return status === 503 && /^AI service(?: at \S+)? is unavailable(?:\.|$)/.test(candidate.message ?? "");
}

export function nodeRetryDelayMs(retryIndex: number): number {
  if (!Number.isInteger(retryIndex) || retryIndex < 0 || retryIndex > MAX_NODE_RETRIES) {
    throw new Error("Node retry index must be between 0 and 3");
  }
  return Math.min(2_000, 250 * 2 ** retryIndex);
}
