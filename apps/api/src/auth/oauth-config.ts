import { ExecutionContext, ServiceUnavailableException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

export function oauthConfigured(provider: "google" | "github"): boolean {
  const prefix = provider.toUpperCase();
  const id = process.env[`${prefix}_CLIENT_ID`]?.trim();
  const secret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();
  return Boolean(id && secret && !/^(replace|example|change)/i.test(id) && !/^(replace|example|change)/i.test(secret));
}

export function ConfiguredOAuthGuard(provider: "google" | "github") {
  return class extends AuthGuard(provider) {
    canActivate(context: ExecutionContext) {
      if (!oauthConfigured(provider)) {
        throw new ServiceUnavailableException(`${provider === "google" ? "Google" : "GitHub"} sign-in is not configured. Use email and password.`);
      }
      return super.canActivate(context);
    }
  };
}
