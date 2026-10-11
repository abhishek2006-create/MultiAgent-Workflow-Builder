import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GoogleCallbackAuthGuard extends AuthGuard("google") {
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
