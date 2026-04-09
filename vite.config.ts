import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  clearScreen: false,
  server: {
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
    port: 5173,
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    chunkSizeWarningLimit: 600,
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // specific packages BEFORE generic 'react' check (they all contain 'react' in path)
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('@tauri-apps')) return 'vendor-tauri'
          if (id.includes('@dnd-kit')) return 'vendor-dnd'
          if (id.includes('@tanstack')) return 'vendor-tanstack'
          if (id.includes('zustand') || id.includes('immer')) return 'vendor-state'
          // @radix-ui merged into vendor-react to avoid circular chunk dependency
          if (id.includes('@radix-ui') || id.includes('react-router') || id.includes('react-dom') || /[/\\]react[/\\]/.test(id)) return 'vendor-react'
          // don't force a catch-all chunk — let Rollup auto-split the rest
          return undefined
        },
      },
    },
  },
})
