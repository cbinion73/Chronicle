import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadChronicleEnv, registerChronicleApi, type ChronicleMiddlewareHost } from './server/chronicleApi'

// All Chronicle API routes live in server/chronicleApi.ts, shared verbatim between
// this dev/preview server and the standalone production server (server/index.ts) —
// Vite's server.middlewares is a plain connect() instance, so registration is
// identical in both contexts.
function chronicleApiDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'chronicle-api',
    configureServer(server) {
      registerChronicleApi(server.middlewares as unknown as ChronicleMiddlewareHost, env)
    },
    configurePreviewServer(server) {
      registerChronicleApi(server.middlewares as unknown as ChronicleMiddlewareHost, env)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadChronicleEnv(mode)

  return {
    plugins: [react(), chronicleApiDevPlugin(env)],
    server: {
      host: '0.0.0.0',
      port: 5174,
      allowedHosts: ['chronicle.teambinion.org', 'localhost', '127.0.0.1'],
    },
  }
})
