import { Injectable } from "@nestjs/common";
import { ConfiguredOAuthGuard } from "../oauth-config";

@Injectable()
export class GithubAuthGuard extends ConfiguredOAuthGuard("github") {}
