# @agentreadyweb/mcp

[![smithery badge](https://smithery.ai/badge/ashudps2004/agentready)](https://smithery.ai/servers/ashudps2004/agentready)
[![npm](https://img.shields.io/npm/v/@agentreadyweb/mcp)](https://www.npmjs.com/package/@agentreadyweb/mcp)

## What is AgentReady?

[AgentReady](https://www.agentready.it.com) is a hosted service that makes any website queryable by AI agents via MCP.

Paste a URL → AgentReady crawls the site, generates a spec-compliant `llms.txt`, and hosts a live `/ask` RAG endpoint and MCP server. Any AI agent with MCP support — Claude Desktop, Cursor, Windsurf, VS Code Copilot, Claude Code — can then query that site in natural language and get cited, multi-page answers.

**The problem it solves:** AI agents using `web_fetch` fetch one page at a time, get empty HTML from JavaScript SPAs (React, Next.js, Vue), and hallucinate when the answer spans multiple pages. AgentReady indexes the whole site, handles JS rendering, and retrieves across pages — so agents get the right answer instead of a confident wrong one.

**What's already indexed:** 110+ developer sites including Stripe, Vercel, Supabase, Tailwind CSS, Next.js, React, Anthropic, OpenAI, Cloudflare, Linear, Figma, Resend, and more. [Browse the directory →](https://www.agentready.it.com/directory)

**Key properties:**
- Works on any public URL — static sites, React/Next.js SPAs, Docusaurus, GitBook, custom engines
- No account required to index your first site
- Shared index — one team member submits a site, everyone on the team can query it instantly
- Handles JS-rendered pages that `web_fetch` returns empty for

## CLI

The same package doubles as a CLI — no install, no account:

```bash
# Agent-readiness report card (llms.txt, sitemap, robots, JS-rendering, index status)
npx @agentreadyweb/mcp grade yourdocs.com

# Ask any site a question, get a cited answer (auto-indexes new sites in ~60s)
npx @agentreadyweb/mcp ask stripe.com "what is the test card number?"

# Index or re-crawl a site
npx @agentreadyweb/mcp index yourdocs.com
npx @agentreadyweb/mcp refresh yourdocs.com
```

For CI, dashboards, or scripts, add `--json` to receive the raw report on
stdout (progress remains on stderr):

```bash
npx @agentreadyweb/mcp grade yourdocs.com --json | jq '.grade, .score'
```

The command still exits `1` when the grade is below `B`.

`grade` exits non-zero below a B, so you can use it as a CI gate. `refresh` in your docs deploy pipeline keeps the index fresh automatically:

```yaml
# GitHub Actions — after your docs deploy step
- run: npx @agentreadyweb/mcp refresh yourdocs.com
```

---

Connect any MCP client to AgentReady:

## Claude Desktop

Add this to your Claude Desktop config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agentready": {
      "command": "npx",
      "args": ["-y", "@agentreadyweb/mcp"]
    }
  }
}
```

Restart Claude Desktop. You'll have four tools available:
- `list_sites` — see all indexed websites
- `submit_site` — index any website so it can be queried
- `ask_site` — query any site by domain with cited, multi-page answers
- `refresh_site` — force a re-crawl of an already-indexed site

## Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "agentready": {
    "command": "npx",
    "args": ["-y", "@agentreadyweb/mcp"]
  }
}
```

## Claude Code

```bash
claude mcp add agentready npx @agentreadyweb/mcp
```

Or add to `.claude/settings.json` in your project root to share with your team:

```json
{
  "mcpServers": {
    "agentready": {
      "command": "npx",
      "args": ["-y", "@agentreadyweb/mcp"]
    }
  }
}
```

## VS Code (GitHub Copilot agent mode)

Requires VS Code 1.99+ with the GitHub Copilot extension. Create `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "agentready": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@agentreadyweb/mcp"]
    }
  }
}
```

Copilot's MCP tools are only available in agent mode. Commit this file to share with your team.

## Windsurf / Zed / other clients

Any MCP client that supports stdio transport works the same way — use `npx -y @agentreadyweb/mcp` as the command.

## WebMCP (no install)

If your client supports HTTP transport (Claude.ai, recent Claude Desktop, Cursor), connect directly by URL — no npm required:

```
https://www.agentready.it.com/api/mcp
```

## Docusaurus plugin

If your docs site uses Docusaurus, auto-index on every build:

```bash
npm install @agentreadyweb/docusaurus-plugin
```

```js
// docusaurus.config.js
plugins: [
  ['@agentreadyweb/docusaurus-plugin', { domain: 'docs.yoursite.com' }]
]
```

## MkDocs plugin

If your docs site uses MkDocs, auto-index on every build:

```bash
pip install mkdocs-agentready
```

```yaml
# mkdocs.yml
plugins:
  - search
  - agentready
```

If `site_url` is not set, specify the domain explicitly:

```yaml
plugins:
  - agentready:
      domain: docs.yoursite.com
```

## Starlight plugin

If your docs site uses Starlight (Astro), auto-index on every build:

```bash
npm install starlight-agentready
```

```js
// astro.config.mjs
import agentready from 'starlight-agentready'

export default defineConfig({
  site: 'https://docs.yoursite.com',
  integrations: [
    starlight({
      plugins: [agentready()],
    }),
  ],
})
```

## Sphinx extension

If your docs site uses Sphinx, auto-index on every build:

```bash
pip install sphinx-agentready
```

```python
# conf.py
extensions = [
    "sphinx_agentready.extension",
]

# Domain is inferred from html_baseurl automatically, or set explicitly:
agentready_domain = "docs.yoursite.com"
```

## Available tools

### list_sites

Lists all websites currently indexed by AgentReady with their titles and page counts. Use this to check if a domain is already available before submitting it.

### submit_site
```
submit_site(url: string)
```
Index any website with AgentReady. Takes ~60 seconds. Handles static sites, server-rendered pages, and JavaScript-heavy SPAs via a four-layer pipeline. Once done, query it with `ask_site`.

**Example:** `submit_site("https://docs.example.com")`

### ask_site
```
ask_site(domain: string, query: string, url?: string)
```
Ask a question about any website and get a cited answer grounded in its content. Synthesises information across multiple pages. If the site isn't indexed yet, AgentReady crawls and indexes it automatically before answering (~60s).

**Example:** `ask_site("stripe.com", "What are the fees for card payments?")`

### refresh_site
```
refresh_site(domain: string)
```
Force a full re-crawl of an already-indexed site to pick up new or changed content. Takes ~60 seconds.

**Example:** `refresh_site("docs.example.com")`

## Deploy webhook

Automatically re-index your docs on every deploy. No auth required — rate limited to once per hour per domain.

```bash
curl -X POST https://www.agentready.it.com/api/webhook/refresh \
  -H "Content-Type: application/json" \
  -d '{"domain": "docs.yoursite.com"}'
```

Or pass the domain as a query param (works with Vercel/Netlify form-encoded webhook payloads):

```
https://www.agentready.it.com/api/webhook/refresh?domain=docs.yoursite.com
```

## How indexing works

AgentReady uses a layered approach to handle any public website:

1. **llms.txt / llms-full.txt** — if the site publishes one, it's used as a high-quality structured content source
2. **Standard HTML crawl** — fetches up to 10 pages via sitemap or link crawling, extracts clean text
3. **`__NEXT_DATA__` extraction** — for Next.js apps, parses server-side rendered data embedded in the HTML
4. **Jina Reader fallback** — for JS-only SPAs that return empty HTML, uses a remote rendering service to extract content

Sites behind authentication or with no public HTML content cannot be indexed.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENTREADY_MCP_URL` | `https://www.agentready.it.com/api/mcp` | Override the MCP endpoint (for self-hosted) |
