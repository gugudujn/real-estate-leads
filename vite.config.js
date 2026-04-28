import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzeLeadWithOpenAI } from './server/analyzeLead.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'lead-analysis-dev-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/analyze-lead', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'method_not_allowed' }))
            return
          }

          let body = ''

          req.on('data', (chunk) => {
            body += chunk
          })

          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}')
              const leadPayload = parsed.leadPayload || {}
              const submissionPath = parsed.submissionPath || 'unknown'

              console.log(
                `[lead-analysis] Vite dev endpoint invoked for submission path "${submissionPath}".`,
              )

              const result = await analyzeLeadWithOpenAI(
                leadPayload,
                submissionPath,
              )

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (error) {
              console.error('[lead-analysis] Invalid dev endpoint request body.')
              console.error(
                error instanceof Error ? error.message : String(error),
              )

              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'invalid_request_body',
                  analysis: {
                    type: '',
                    location: '',
                    budget: '',
                    timeline: '',
                    property_type: '',
                    financing_status: '',
                    intent: '',
                    summary: '',
                    follow_up_message: '',
                  },
                }),
              )
            }
          })
        })
      },
    },
  ],
})
