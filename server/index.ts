import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { createApp } from './app.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure we load the workspace-root .env even if the process CWD differs (tsx watch, tasks, etc.).
dotenv.config({
  path: path.resolve(__dirname, '..', '.env'),
  override: true,
})

const port = Number(process.env.PORT ?? 8787)
const app = createApp()

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`)
})
