import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import type { RequestHandler } from "express";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser());
  app.setGlobalPrefix("api");
  const allowedOrigins = config.getOrThrow<string>("WEB_ORIGIN").split(",").map((origin) => origin.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ limit: "1mb", extended: true }));
  const authRateWindows = new Map<string, { count: number; resetAt: number }>();
  const authRateLimit: RequestHandler = (request, response, next) => {
    const limits: Record<string, { max: number; windowMs: number }> = {
      "/api/auth/login": { max: 10, windowMs: 15 * 60 * 1000 },
      "/api/auth/register": { max: 5, windowMs: 60 * 60 * 1000 },
      "/api/auth/google": { max: 10, windowMs: 15 * 60 * 1000 },
      "/api/auth/github": { max: 10, windowMs: 15 * 60 * 1000 },
    };
    const limit = request.method === "POST" || request.method === "GET"
      ? limits[request.path]
      : undefined;
    if (!limit) return next();

    const now = Date.now();
    const email = typeof request.body?.email === "string"
      ? request.body.email.trim().toLowerCase()
      : "";
    const key = `${request.path}:${email || request.ip}`;
    if (authRateWindows.size > 5000) {
      for (const [entryKey, entry] of authRateWindows) {
        if (entry.resetAt <= now) authRateWindows.delete(entryKey);
      }
      while (authRateWindows.size > 5000) {
        const oldestKey = authRateWindows.keys().next().value;
        if (!oldestKey) break;
        authRateWindows.delete(oldestKey);
      }
    }
    const current = authRateWindows.get(key);
    if (!current || current.resetAt <= now) {
      authRateWindows.set(key, { count: 1, resetAt: now + limit.windowMs });
      return next();
    }
    if (current.count >= limit.max) {
      response.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return response.status(429).json({ message: "Too many authentication attempts. Try again later." });
    }
    current.count += 1;
    return next();
  };
  app.use(authRateLimit);

  const csrfOriginCheck: RequestHandler = (request, response, next) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return next();
    const authorization = request.headers.authorization ?? "";
    if (/^Bearer\s+\S+$/i.test(authorization)) return next();
    if (!request.headers.origin || !allowedOrigins.includes(request.headers.origin)) {
      return response.status(403).json({ message: "Request origin is not allowed." });
    }
    return next();
  };
  app.use(csrfOriginCheck);
  const legacyOAuthCallbackAliases: RequestHandler = (request, _response, next) => {
    if (request.method === "GET") {
      request.url = request.url.replace(
        /^\/auth\/(google|github)\/callback(?=\?|$)/,
        "/api/auth/$1/callback",
      );
    }
    next();
  };
  app.use(legacyOAuthCallbackAliases);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use((request: { method: string; path: string }, response: { statusCode: number; on: (event: string, callback: () => void) => void }, next: () => void) => {
    const startedAt = Date.now();
    response.on("finish", () => {
      console.log(JSON.stringify({
        level: "info",
        event: "http_request",
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      }));
    });
    next();
  });

  app.enableShutdownHooks();
  const port = config.get<number>("API_PORT", 3001);
  await app.listen(port, "0.0.0.0");

  console.log(`API server listening on port ${port}`);
}

void bootstrap();
