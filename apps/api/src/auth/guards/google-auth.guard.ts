import { Injectable } from "@nestjs/common";
import { ConfiguredOAuthGuard } from "../oauth-config";

@Injectable()
export class GoogleAuthGuard extends ConfiguredOAuthGuard("google") {}
