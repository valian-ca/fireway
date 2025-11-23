import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    clearMocks: true,
    environment: 'node',
    fileParallelism: false,
    sequence: { concurrent: false },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/cli.ts', 'src/types/**', 'src/__tests__/**'],
    },
  },
})
