import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from mkdocs.config import config_options
from mkdocs.plugins import BasePlugin

log = logging.getLogger(__name__)

WEBHOOK_URL = "https://www.agentready.it.com/api/webhook/refresh"
MCP_URL = "https://www.agentready.it.com/api/mcp"


class AgentReadyPlugin(BasePlugin):
    config_scheme = (
        ("domain", config_options.Type(str, default="")),
    )

    def on_post_build(self, config, **kwargs):
        domain = self.config["domain"] or _domain_from_site_url(config.get("site_url", ""))

        if not domain:
            log.warning(
                "[AgentReady] No domain found. Either set `domain` in your plugin config "
                "or add `site_url` to mkdocs.yml."
            )
            return

        log.info(f"[AgentReady] Submitting {domain} for indexing...")

        payload = json.dumps({"domain": domain}).encode("utf-8")
        req = urllib.request.Request(
            WEBHOOK_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "mkdocs-agentready/1.0.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                log.info(f"[AgentReady] ✓ {result.get('message', 'Indexed successfully.')}")
                log.info(f"[AgentReady]   MCP:  {MCP_URL}")
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            try:
                msg = json.loads(body).get("message") or json.loads(body).get("error") or body
            except Exception:
                msg = body
            # 429 means the domain was refreshed recently — not an error worth surfacing loudly
            if e.code == 429:
                log.info(f"[AgentReady] {msg}")
            else:
                log.warning(f"[AgentReady] Indexing request failed ({e.code}): {msg}")
        except Exception as e:
            log.warning(f"[AgentReady] Could not reach AgentReady: {e}")


def _domain_from_site_url(site_url: str) -> str:
    if not site_url:
        return ""
    try:
        return urllib.parse.urlparse(site_url).netloc.replace("www.", "")
    except Exception:
        return ""
