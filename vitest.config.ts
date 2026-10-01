import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Node environment: these are logic and invariant tests, not DOM rendering
    // tests, so there is no need to pay for jsdom.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: 'default',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
