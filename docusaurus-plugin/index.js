// @agentreadyweb/docusaurus-plugin
// Automatically indexes your Docusaurus site in AgentReady after each build.
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
//   secret     — WEBHOOK_REFRESH_SECRET for forced re-index (optional)

const AGENTREADY_API = 'https://www.agentready.it.com'

async function submitSite(url) {
  const res = await fetch(`${AGENTREADY_API}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': '@agentreadyweb/docusaurus-plugin/1.0.0' },
    body: JSON.stringify({ url }),
  })
  return { ok: res.ok, status: res.status }
}

async function refreshSite(domain, secret) {
  const res = await fetch(`${AGENTREADY_API}/api/webhook/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': '@agentreadyweb/docusaurus-plugin/1.0.0', 'Authorization': `Bearer ${secret}` },
    body: JSON.stringify({ domain }),
  })
  return { ok: res.ok, status: res.status }
}

function resolveUrl(domain, siteConfigUrl) {
  if (domain) return domain.startsWith('http') ? domain : `https://${domain}`
  if (siteConfigUrl) return siteConfigUrl
  return null
}

/** @param {import('@docusaurus/types').LoadContext} context */
module.exports = function agentReadyPlugin(context, options = {}) {
  const { domain, autoSubmit = true, secret } = options

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
        let result
        if (secret) {
          result = await refreshSite(cleanDomain, secret)
        } else {
          result = await submitSite(url)
        }

        if (result.ok) {
          console.log(`[AgentReady] ✓ Indexed! Agents can now query your docs at:`)
          console.log(`  MCP:  ${AGENTREADY_API}/api/mcp`)
          console.log(`  Ask:  ${AGENTREADY_API}/${cleanDomain}/ask`)
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
