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

Restart Claude Desktop. You'll have three tools available:
- `submit_site` — index any website so it can be queried
- `list_sites` — see all indexed websites
- `ask_site` — query any site by domain

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

## WebMCP (no install)

If your client supports HTTP transport (Claude.ai, recent Claude Desktop, Cursor), connect directly by URL — no npm required:

```
https://www.agentready.it.com/api/mcp
```

## Available tools

### submit_site
```
submit_site(url: string)
```
Index a website with AgentReady. Takes ~60 seconds. Handles static sites, server-rendered pages, and JavaScript-heavy SPAs via fallback rendering. Once done, query it with `ask_site`.

**Example:** `submit_site("https://docs.example.com")`

### list_sites
Lists all websites currently indexed by AgentReady with their titles and summaries.

### ask_site
```
ask_site(domain: string, query: string)
```
Ask a question about any website and get a cited answer grounded in its content. If the site isn't indexed yet, AgentReady will crawl and index it automatically before answering.

**Example:** `ask_site("example.com", "What does this site do?")`

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
