import { createServer } from 'node:http'
import { resolve } from 'node:path'
import connect from 'connect'
import serveStatic from 'serve-static'
import { applyDotEnvFileToProcessEnv, loadChronicleEnv, registerChronicleApi } from './chronicleApi'

// Mirrors chronicleApi.ts's own module-load-time call — .env.local must reach
// process.env before anything (Prisma included) reads it. Safe to call twice:
// applyDotEnvFileToProcessEnv never overwrites a value that's already set.
applyDotEnvFileToProcessEnv(resolve(process.cwd(), '.env.local'))

const env = loadChronicleEnv('production')
const app = connect()

registerChronicleApi(app, env)

const distDir = resolve(process.cwd(), 'dist')
const serveDist = serveStatic(distDir, { index: 'index.html' })
app.use(serveDist)

// SPA fallback: any remaining GET that isn't under /api falls through to
// index.html so client-side routes survive a hard refresh/direct link.
app.use((request, response, next) => {
  if (request.method !== 'GET' || request.url?.startsWith('/api')) {
    next?.()
    return
  }
  request.url = '/index.html'
  serveDist(request, response, next as () => void)
})

app.use((_request, response) => {
  response.statusCode = 404
  response.end('Not found')
})

const port = Number(process.env.PORT || 5174)
createServer(app).listen(port, '0.0.0.0', () => {
  console.log(`[chronicle] listening on :${port}`)
})
