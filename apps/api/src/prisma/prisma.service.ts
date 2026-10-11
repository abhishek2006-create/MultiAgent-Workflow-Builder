import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch {
      const databaseUrl = process.env.DATABASE_URL;
      let endpoint = "the configured DATABASE_URL";
      if (databaseUrl) {
        try {
          const parsed = new URL(databaseUrl);
          endpoint = `${parsed.hostname}:${parsed.port || "5432"}`;
        } catch {
          // Leave the endpoint generic so credentials are never included in startup logs.
        }
      }
      throw new Error(
        `Cannot connect to PostgreSQL at ${endpoint}. Start the local database with ` +
          `"npm run db:up" from the repository root, then apply migrations with ` +
          `"npm --workspace apps/api run db:migrate:deploy".`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
