import path from "node:path";
import type { NextConfig } from "next";

const apiInternalUrl = (
  process.env.API_INTERNAL_URL ??
  (process.env.NODE_ENV === "production"
    ? "http://api:3001"
    : "http://127.0.0.1:3001")
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
