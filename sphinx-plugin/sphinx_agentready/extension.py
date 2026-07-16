import json
import logging
import urllib.error
import urllib.parse
import urllib.request

log = logging.getLogger(__name__)

WEBHOOK_URL = "https://www.agentready.it.com/api/webhook/refresh"
MCP_URL = "https://www.agentready.it.com/api/mcp"


def _post_to_agentready(domain: str) -> None:
    payload = json.dumps({"domain": domain}).encode("utf-8")
    req = urllib.request.Request(
        WEBHOOK_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "sphinx-agentready/1.0.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            log.info("[AgentReady] ✓ %s", result.get("message", "Indexed successfully."))
            log.info("[AgentReady]   MCP:  %s", MCP_URL)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            msg = json.loads(body).get("message") or json.loads(body).get("error") or body
        except Exception:
            msg = body
        if e.code == 429:
            log.info("[AgentReady] %s", msg)
        else:
            log.warning("[AgentReady] Indexing request failed (%s): %s", e.code, msg)
    except Exception as e:
        log.warning("[AgentReady] Could not reach AgentReady: %s", e)


def on_build_finished(app, exception):
    if exception:
        return
    if app.builder.name not in ("html", "dirhtml", "singlehtml"):
        return

    domain = app.config.agentready_domain
    if not domain:
        site_url = getattr(app.config, "html_baseurl", "") or ""
        try:
            domain = urllib.parse.urlparse(site_url).netloc.replace("www.", "")
        except Exception:
            domain = ""

    if not domain:
        log.warning(
            "[AgentReady] No domain configured. Set agentready_domain in conf.py "
            "or add html_baseurl to your Sphinx config."
        )
        return

    log.info("[AgentReady] Submitting %s for indexing...", domain)
    _post_to_agentready(domain)


def setup(app):
    app.add_config_value("agentready_domain", default="", rebuild="html")
    app.connect("build-finished", on_build_finished)
    return {
        "version": "1.0.0",
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
