# @agentreadyweb/mcp

Connect any MCP client to [AgentReady](https://www.agentready.it.com) — a hosted service that makes any website queryable by AI agents.

## Claude Desktop

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

Restart Claude Desktop. You'll have two tools available:
- `list_sites` — see all indexed websites
- `ask_site` — query any site by domain

## Available tools

### list_sites
Lists all websites indexed by AgentReady.

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
