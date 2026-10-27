import { ExecutionContext, Injectable } from "@nestjs/common";
import { ConfiguredOAuthGuard } from "../oauth-config";

@Injectable()
export class GoogleCallbackAuthGuard extends ConfiguredOAuthGuard("google") {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | null | undefined,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser {
    // Let the callback controller redirect provider denials to the login page.
    if (err || !user) return null as TUser;
    return user;
  }
}
