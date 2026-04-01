import { defineConfig } from 'steiger'
import fsd from '@feature-sliced/steiger-plugin'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: ['src/shared/hooks/**'],
    rules: {
      // shared/hooks is a conventional segment name for React hooks;
      // FSD recommends purpose-based names but hooks is widely accepted
      'fsd/segments-by-purpose': 'off',
    },
  },
  {
    files: ['src/entities/**', 'src/features/**'],
    rules: {
      // New slices created before their upper-layer consumers;
      // will be referenced once widgets/ and pages/ wire them
      'fsd/insignificant-slice': 'off',
    },
  },
])
