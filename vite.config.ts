import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'persistence-api',
      configureServer(server) {
        server.middlewares.use('/api/tasks', (req, res, next) => {
          const tasksPath = path.resolve(__dirname, 'tasks.json')

          if (req.method === 'GET') {
            const data = fs.readFileSync(tasksPath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } else if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              fs.writeFileSync(tasksPath, body, 'utf-8')
              res.statusCode = 200
              res.end('OK')
            })
          } else {
            next()
          }
        })
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      ignored: ['**/node_modules/**', '**/tasks.json'] // Ignore tasks.json to prevent reload loops
    },
    hmr: {
      clientPort: 5173,
    },
  },
})
