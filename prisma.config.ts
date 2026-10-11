import { defineConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ["apps/api/.env", ".env"] });

export default defineConfig({
  schema: "apps/api/prisma/schema.prisma",
});
