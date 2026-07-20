# mkdocs-agentready

MkDocs plugin that submits your docs site to [AgentReady](https://www.agentready.it.com) after every build, making it instantly queryable by agents through any MCP-compatible client with cited, multi-page answers.

## Installation

```bash
pip install mkdocs-agentready
```

## Usage

Add the plugin to your `mkdocs.yml`:

```yaml
site_url: https://docs.yoursite.com  # used to infer domain automatically

plugins:
  - search
  - agentready
```

If you don't have `site_url` set, specify the domain explicitly:

```yaml
plugins:
  - search
  - agentready:
      domain: docs.yoursite.com
```

After each `mkdocs build` or `mkdocs gh-deploy`:

```
INFO  -  [AgentReady] ✓ Indexed docs.yoursite.com. AI agents can now query it.
INFO  -  [AgentReady]   MCP:  https://www.agentready.it.com/api/mcp
```

## How it works

After your site builds, the plugin posts your domain to AgentReady's indexing webhook. AgentReady crawls your docs and makes them queryable via:

- **MCP server** — `https://www.agentready.it.com/api/mcp` (works with any MCP-compatible client)
- **REST endpoint** — `POST https://www.agentready.it.com/api/sites/{id}/ask`
- **llms.txt** — `https://www.agentready.it.com/api/sites/{id}/llms.txt`

## Connecting to your AI tools

**Local MCP bridge (stdio)**

```bash
npx @agentreadyweb/mcp
```

**VS Code (GitHub Copilot)**

```json
// .vscode/mcp.json
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

Then ask your AI: _"Ask agentready: how do I configure X in [your docs]?"_

The MCP server currently exposes seven tools: `list_sites`, `get_site_capabilities`, `ask_site`, `plan_site_action`, `submit_site`, `refresh_site`, and `rate_answer`. Plans are read-only; any action connector requires explicit confirmation.

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `domain` | _(inferred from `site_url`)_ | Domain of your docs site (e.g. `docs.example.com`) |

## License

MIT © [AgentReady](https://www.agentready.it.com)
