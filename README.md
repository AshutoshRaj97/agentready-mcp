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

## Available tools

### submit_site
```
submit_site(url: string)
```
Index a website with AgentReady. Takes ~60 seconds. Once done, query it with `ask_site`.

**Example:** `submit_site("https://docs.example.com")`

### list_sites
Lists all websites currently indexed by AgentReady.

### ask_site
```
ask_site(domain: string, query: string)
```
Ask a question about any indexed site and get a cited answer grounded in its content.

**Example:** `ask_site("example.com", "What does this site do?")`

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENTREADY_MCP_URL` | `https://www.agentready.it.com/api/mcp` | Override the MCP endpoint (for self-hosted) |
