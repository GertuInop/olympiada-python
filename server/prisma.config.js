import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // fallback нужен для docker build (prisma generate без .env)
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
});
