import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/agriopportunity_test',
      JWT_SECRET: 'test-secret',
    },
  },
});
