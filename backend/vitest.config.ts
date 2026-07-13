import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ['tests/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      BCRYPT_ROUNDS: '4',
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://yoon@localhost:5432/kota_test',
      REDIS_URL: '',
      TOURAPI_SERVICE_KEY: 'test-key',
    },
    testTimeout: 20000,
    hookTimeout: 30000,
  },
})
