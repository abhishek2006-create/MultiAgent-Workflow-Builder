import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AiClientService } from "./ai-client.service";

@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiClientService) {}

  @Get("configuration")
  configuration() {
    return this.ai.configuration();
  }
}
