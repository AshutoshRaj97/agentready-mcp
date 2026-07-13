# @agentreadyweb/mcp

[![smithery badge](https://smithery.ai/badge/ashudps2004/agentready)](https://smithery.ai/servers/ashudps2004/agentready)

Connect any MCP client to [AgentReady](https://www.agentready.it.com) — a hosted service that makes any website queryable by AI agents.

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
