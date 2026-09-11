import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations should use a direct connection when the provider exposes
    // one. The application runtime continues to use DATABASE_URL.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
