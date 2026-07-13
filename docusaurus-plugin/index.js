// @agentreadyweb/docusaurus-plugin
// Automatically re-indexes your Docusaurus site in AgentReady after each build.
// AI agents (Claude, Cursor, Windsurf, etc.) can then query your docs via MCP.
//
// Usage in docusaurus.config.js:
//   plugins: [
//     ['@agentreadyweb/docusaurus-plugin', { domain: 'docs.example.com' }]
//   ]
//
// Options:
//   domain     — your docs domain (falls back to siteConfig.url if omitted)
//   autoSubmit — set to false to disable the postBuild API call (default: true)

const AGENTREADY_API = 'https://www.agentready.it.com'

async function submitSite(url) {
  const res = await fetch(`${AGENTREADY_API}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': '@agentreadyweb/docusaurus-plugin/1.0.1' },
    body: JSON.stringify({ url }),
  })
  return { ok: res.ok, status: res.status }
}

async function refreshSite(domain) {
  const res = await fetch(`${AGENTREADY_API}/api/webhook/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': '@agentreadyweb/docusaurus-plugin/1.0.1' },
    body: JSON.stringify({ domain }),
  })
  return { ok: res.ok || res.status === 429, status: res.status }
}

function resolveUrl(domain, siteConfigUrl) {
  if (domain) return domain.startsWith('http') ? domain : `https://${domain}`
  if (siteConfigUrl) return siteConfigUrl
  return null
}

/** @param {import('@docusaurus/types').LoadContext} context */
module.exports = function agentReadyPlugin(context, options = {}) {
  const { domain, autoSubmit = true } = options

  return {
    name: 'agentready-docusaurus-plugin',

    /** Called after every successful build (local dev and production). */
    async postBuild({ siteConfig }) {
      if (!autoSubmit) return

      const url = resolveUrl(domain, siteConfig.url)
      if (!url) {
        console.warn('[AgentReady] No URL found — set `domain` in plugin options or `url` in docusaurus.config.js')
        return
      }

      const cleanDomain = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
      console.log(`[AgentReady] Indexing ${url} so AI agents can query your docs…`)

      try {
        // Try refresh first (faster for already-indexed sites), fall back to submit
        let result = await refreshSite(cleanDomain)
        if (result.status === 404) result = await submitSite(url)

        if (result.ok) {
          console.log(`[AgentReady] ✓ Indexed! Agents can now query your docs at:`)
          console.log(`  MCP:  ${AGENTREADY_API}/api/mcp`)
          console.log(`  More: ${AGENTREADY_API}/connect`)
        } else {
          console.warn(`[AgentReady] Submission returned ${result.status} — index manually at ${AGENTREADY_API}`)
        }
      } catch (err) {
        // Never fail the build
        console.warn(`[AgentReady] Could not reach AgentReady (${err.message}) — index manually at ${AGENTREADY_API}`)
      }
    },
  }
}
