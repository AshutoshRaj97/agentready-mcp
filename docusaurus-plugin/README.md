# @agentreadyweb/docusaurus-plugin

Auto-index your Docusaurus site in [AgentReady](https://www.agentready.it.com) after every build — making your docs instantly queryable by Claude, Cursor, Windsurf, and any MCP client.

## Install

```bash
npm install @agentreadyweb/docusaurus-plugin
```

## Usage

```js
// docusaurus.config.js
plugins: [
  ['@agentreadyweb/docusaurus-plugin', { domain: 'docs.yoursite.com' }]
]
```

That's it. After each `docusaurus build`, the plugin POSTs your domain to AgentReady's webhook. If the site isn't indexed yet, it gets crawled automatically. If it is, the index refreshes.

```
[AgentReady] ✓ Indexed! Agents can now query your docs at:
  MCP:  https://www.agentready.it.com/api/mcp
```

## What it does

- Hooks into Docusaurus's `postBuild` lifecycle
- Calls `POST https://www.agentready.it.com/api/webhook/refresh` with your domain
- No API key or account needed — rate limited to once per hour per domain
- New sites are indexed automatically; existing sites are refreshed

## Querying your docs

Once indexed, any MCP client can query your docs:

```js
// Claude Desktop / Cursor / Windsurf
// Add to your MCP config:
{
  "agentready": {
    "command": "npx",
    "args": ["-y", "@agentreadyweb/mcp"]
  }
}
```

Or connect via HTTP:
```
https://www.agentready.it.com/api/mcp
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `domain` | `string` | Yes | Your docs domain (e.g. `docs.yoursite.com`) |

## Links

- [AgentReady](https://www.agentready.it.com)
- [MCP package](https://www.npmjs.com/package/@agentreadyweb/mcp)
- [Source](https://github.com/AshutoshRaj97/agentready-mcp/tree/main/docusaurus-plugin)
