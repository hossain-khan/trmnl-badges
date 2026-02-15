import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/global.d.ts',
        'src/types.ts', // Type definitions only
        'src/trmnl-api.ts', // Mocked in tests
      ],
    },
  },
});
