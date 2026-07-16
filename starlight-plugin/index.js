const WEBHOOK_URL = 'https://www.agentready.it.com/api/webhook/refresh'
const MCP_URL = 'https://www.agentready.it.com/api/mcp'

/**
 * @param {{ domain?: string }} [options]
 * @returns {import('@astrojs/starlight').StarlightPlugin}
 */
export default function agentready(options = {}) {
  return {
    name: 'starlight-agentready',
    hooks: {
      setup({ config, logger, addIntegration }) {
        const domain =
          options.domain ||
          (() => {
            try {
              return new URL(config.site ?? '').hostname.replace(/^www\./, '')
            } catch {
              return ''
            }
          })()

        addIntegration({
          name: 'astro-agentready',
          hooks: {
            'astro:build:done': async () => {
              if (!domain) {
                logger.warn(
                  '[AgentReady] No domain found. Set `domain` in the plugin options or add `site` to astro.config.mjs.'
                )
                return
              }

              logger.info(`[AgentReady] Submitting ${domain} for indexing...`)

              try {
                const res = await fetch(WEBHOOK_URL, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'starlight-agentready/1.0.0',
                  },
                  body: JSON.stringify({ domain }),
                  signal: AbortSignal.timeout(120_000),
                })

                const result = await res.json()

                if (res.status === 429) {
                  logger.info(`[AgentReady] ${result.message}`)
                } else if (!res.ok) {
                  logger.warn(
                    `[AgentReady] Indexing failed (${res.status}): ${result.message ?? result.error ?? 'Unknown error'}`
                  )
                } else {
                  logger.info(`[AgentReady] ✓ ${result.message ?? 'Indexed successfully.'}`)
                  logger.info(`[AgentReady]   MCP:  ${MCP_URL}`)
                }
              } catch (err) {
                logger.warn(`[AgentReady] Could not reach AgentReady: ${err.message}`)
              }
            },
          },
        })
      },
    },
  }
}
