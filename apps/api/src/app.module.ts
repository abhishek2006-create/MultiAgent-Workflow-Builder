import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ExecutionsModule } from './executions/executions.module';
import { AiModule } from './ai/ai.module';

function validateEnvironment(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(
    (key) => typeof config[key] !== 'string' || !(config[key] as string).trim(),
  );
  if (missing.length) {
    throw new Error(`Missing required API configuration: ${missing.join(', ')}`);
  }

  const jwtSecret = config.JWT_SECRET as string;
  if (
    config.NODE_ENV === 'production' &&
    (jwtSecret.length < 32 || /replace|change|example|local_dev/i.test(jwtSecret))
  ) {
    throw new Error('JWT_SECRET must be a non-placeholder secret of at least 32 characters in production');
  }

  const port = config.API_PORT;
  if (port !== undefined && (!/^\d+$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535)) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }

  const aiTimeout = Number(config.AI_REQUEST_TIMEOUT_MS ?? 25_000);
  if (!Number.isInteger(aiTimeout) || aiTimeout < 1_000 || aiTimeout > 120_000) {
    throw new Error('AI_REQUEST_TIMEOUT_MS must be an integer between 1000 and 120000');
  }
  const aiSecret = typeof config.AI_SERVICE_SECRET === 'string' ? config.AI_SERVICE_SECRET : '';
  if (config.NODE_ENV === 'production' && aiSecret.length < 32) {
    throw new Error('AI_SERVICE_SECRET must contain at least 32 characters in production');
  }

  const origins = config.WEB_ORIGIN ?? config.FRONTEND_URL ?? 'http://localhost:3000';
  if (typeof origins !== 'string') {
    throw new Error('WEB_ORIGIN must contain one or more comma-separated HTTP(S) origins');
  }
  const normalizedOrigins = origins.split(',').map((origin) => origin.trim());
  if (!normalizedOrigins.length || normalizedOrigins.some((origin) => {
    try {
      const url = new URL(origin);
      return !['http:', 'https:'].includes(url.protocol) ||
        url.origin !== origin ||
        (config.NODE_ENV === 'production' && ['localhost', '127.0.0.1'].includes(url.hostname));
    } catch {
      return true;
    }
  })) {
    throw new Error('WEB_ORIGIN must contain only exact HTTP(S) origins; production origins cannot be localhost');
  }

  return { ...config, WEB_ORIGIN: origins, AI_REQUEST_TIMEOUT_MS: aiTimeout };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    WorkflowsModule,
    WorkspacesModule,
    ExecutionsModule,
    AiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
