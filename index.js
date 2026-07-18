#!/usr/bin/env node
// AgentReady MCP bridge + CLI
//
// MCP bridge (default, used by Claude Desktop / Cursor / any stdio MCP client):
//   npx @agentreadyweb/mcp
//
// CLI commands:
//   npx @agentreadyweb/mcp grade <url> [--json]     Agent-readiness report card
//   npx @agentreadyweb/mcp ask <domain> <question>  Ask any site a question
//   npx @agentreadyweb/mcp index <url>              Index a site (~60s)
//   npx @agentreadyweb/mcp refresh <domain>         Force a re-crawl

const MCP_URL = process.env.AGENTREADY_MCP_URL || 'https://www.agentready.it.com/api/mcp'
const APP_ORIGIN = new URL(MCP_URL).origin
const VERSION = require('./package.json').version
const UA = `@agentreadyweb/mcp/${VERSION}`
const BRIDGE_TIMEOUT_MS = 120000

// ─── ANSI helpers (no deps; respect NO_COLOR and non-TTY) ────────────────────

const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const c = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s)
const bold = c('1')
const dim = c('2')
const green = c('32')
const red = c('31')
const yellow = c('33')
const cyan = c('36')

async function readJsonResponse(res) {
  const body = await res.text()
  if (!body) return null
  try { return JSON.parse(body) } catch { return null }
}

function describeHttpError(res, data) {
  const message = data?.error?.message || data?.message || `AgentReady returned HTTP ${res.status}`
  const retryAfter = res.headers.get('retry-after')
  return retryAfter ? `${message} Retry after ${retryAfter}s.` : message
}

// ─── MCP stdio bridge (default mode) ─────────────────────────────────────────

function runMcpBridge() {
  let pending = 0
  let stdinEnded = false

  function writeProtocolError(code, message) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code, message },
    }) + '\n')
  }

  function tryExit() {
    if (stdinEnded && pending === 0) process.exit(0)
  }

  async function forward(msg) {
    const isNotification = !('id' in msg)
    pending++
    try {
      const res = await fetch(MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': UA,
        },
        body: JSON.stringify(msg),
        signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
      })
      if (isNotification || res.status === 202) return
      const data = await readJsonResponse(res)
      if (!res.ok) throw new Error(describeHttpError(res, data))
      if (!data) throw new Error(`AgentReady returned invalid JSON (HTTP ${res.status})`)
      process.stdout.write(JSON.stringify(data) + '\n')
    } catch (e) {
      if (!isNotification) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id ?? null,
            error: { code: -32603, message: `AgentReady MCP error: ${e.message}` },
          }) + '\n'
        )
      }
    } finally {
      pending--
      tryExit()
    }
  }

  process.stdin.setEncoding('utf8')
  let buf = ''

  process.stdin.on('data', (chunk) => {
    buf += chunk
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const message = JSON.parse(line)
        if (message === null || typeof message !== 'object') {
          writeProtocolError(-32600, 'Invalid Request')
          continue
        }
        void forward(message)
      } catch {
        writeProtocolError(-32700, 'Parse error')
      }
    }
  })

  process.stdin.on('end', () => {
    stdinEnded = true
    tryExit()
  })
}

// ─── CLI helpers ─────────────────────────────────────────────────────────────

async function callTool(name, args, timeoutMs = 90000) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': `${UA} (cli)` },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const data = await readJsonResponse(res)
  if (!res.ok) throw new Error(describeHttpError(res, data))
  if (!data) throw new Error(`AgentReady returned invalid JSON (HTTP ${res.status})`)
  if (data.error) throw new Error(data.error.message)
  return { text: data.result?.content?.[0]?.text ?? '', isError: data.result?.isError === true }
}

function fail(msg) {
  console.error(`\n  ${red('✗')} ${msg}\n`)
  process.exit(1)
}

const GRADE_COLORS = { 'A+': green, A: green, B: cyan, C: yellow, D: yellow, F: red }

// ─── grade ───────────────────────────────────────────────────────────────────

async function cmdGrade(url, jsonOutput = false) {
  if (!url) fail('Usage: npx @agentreadyweb/mcp grade <url>')
  process.stderr.write(dim(`\n  Checking ${url} …\n`))

  let data
  try {
    const res = await fetch(`${APP_ORIGIN}/api/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': `${UA} (cli)` },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30000),
    })
    data = await readJsonResponse(res)
    if (!data) fail(`AgentReady returned invalid JSON (HTTP ${res.status})`)
    if (!res.ok) fail(data.error || `Server returned ${res.status}`)
  } catch (e) {
    fail(`Could not reach AgentReady: ${e.message}`)
  }

  // Keep stdout valid JSON for CI, GitHub Actions, and dashboards. Progress
  // remains on stderr so callers can safely pipe stdout into jq or a file.
  if (jsonOutput) {
    console.log(JSON.stringify(data))
    process.exit(data.score >= 4 ? 0 : 1)
  }

  const gradeColor = GRADE_COLORS[data.grade] ?? red
  console.log(`\n  ${bold('AgentReady Report Card')} ${dim('·')} ${bold(data.domain)}\n`)
  console.log(`  Grade: ${gradeColor(bold(` ${data.grade} `))} ${dim(`(${data.score}/${data.checks.length} checks passed)`)}\n`)

  const labelWidth = Math.max(...data.checks.map((ch) => ch.label.length)) + 2
  for (const ch of data.checks) {
    const icon = ch.pass ? green('✓') : red('✗')
    const label = ch.label.padEnd(labelWidth)
    console.log(`  ${icon} ${label}${dim(ch.detail)}`)
  }

  const failed = data.checks.filter((ch) => !ch.pass)
  console.log('')
  if (failed.some((ch) => ch.id === 'indexed_in_agentready')) {
    console.log(`  ${yellow('→')} Make it queryable in ~60s: ${cyan(`npx @agentreadyweb/mcp index ${data.domain}`)}`)
  }
  if (failed.some((ch) => ch.id === 'llms_txt')) {
    console.log(`  ${yellow('→')} Generate a free llms.txt: ${cyan(`${APP_ORIGIN}/?url=${encodeURIComponent(data.domain)}`)}`)
  }
  if (failed.length === 0) {
    console.log(`  ${green('★')} Fully agent-ready. Add the badge: ${cyan(`${APP_ORIGIN}/badge`)}`)
  }
  console.log('')
  process.exit(data.score >= 4 ? 0 : 1) // CI-friendly: fail builds below a B
}

// ─── ask / index / refresh ───────────────────────────────────────────────────

async function cmdAsk(domain, questionParts) {
  const question = (questionParts || []).join(' ').trim()
  if (!domain || !question) fail('Usage: npx @agentreadyweb/mcp ask <domain> "<question>"')
  process.stderr.write(dim(`\n  Asking ${domain} … (auto-indexes if new, ~60s)\n\n`))
  try {
    const { text, isError } = await callTool('ask_site', { domain, query: question })
    if (isError) fail(text)
    console.log(text.split('\n').map((l) => `  ${l}`).join('\n') + '\n')
  } catch (e) {
    fail(e.message)
  }
}

async function cmdIndex(url) {
  if (!url) fail('Usage: npx @agentreadyweb/mcp index <url>')
  process.stderr.write(dim(`\n  Indexing ${url} … (~60s)\n`))
  try {
    const { text, isError } = await callTool('submit_site', { url })
    if (isError) fail(text)
    console.log(`\n  ${green('✓')} ${text}\n`)
  } catch (e) {
    fail(e.message)
  }
}

async function cmdRefresh(domain) {
  if (!domain) fail('Usage: npx @agentreadyweb/mcp refresh <domain>')
  process.stderr.write(dim(`\n  Refreshing ${domain} … (~60s)\n`))
  try {
    const { text, isError } = await callTool('refresh_site', { domain })
    if (isError) fail(text)
    console.log(`\n  ${green('✓')} ${text}\n`)
  } catch (e) {
    fail(e.message)
  }
}

// ─── help / dispatch ─────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
  ${bold('AgentReady')} ${dim(`v${VERSION}`)} — make any website queryable by AI agents

  ${bold('Usage')}
    npx @agentreadyweb/mcp                       ${dim('start MCP stdio bridge (for Claude/Cursor config)')}
    npx @agentreadyweb/mcp grade <url> [--json]  ${dim('agent-readiness report card (exit 1 below a B — CI-friendly)')}
    npx @agentreadyweb/mcp ask <domain> "<q>"    ${dim('ask any site a question, get a cited answer')}
    npx @agentreadyweb/mcp index <url>           ${dim('index a site so agents can query it (~60s)')}
    npx @agentreadyweb/mcp refresh <domain>      ${dim('force a re-crawl (use after docs deploys)')}

  ${bold('Examples')}
    npx @agentreadyweb/mcp grade mydocs.com
    npx @agentreadyweb/mcp ask stripe.com "what is the test card number?"

  ${dim(`Hosted MCP endpoint: ${MCP_URL}`)}
  ${dim(`Docs: ${APP_ORIGIN}/connect`)}
`)
}

const [, , cmd, ...rest] = process.argv
switch (cmd) {
  case undefined:
    runMcpBridge()
    break
  case 'grade':
    cmdGrade(rest.find((arg) => arg !== '--json'), rest.includes('--json'))
    break
  case 'ask':
    cmdAsk(rest[0], rest.slice(1))
    break
  case 'index':
    cmdIndex(rest[0])
    break
  case 'refresh':
    cmdRefresh(rest[0])
    break
  case 'help':
  case '--help':
  case '-h':
    printHelp()
    break
  case '--version':
  case '-v':
    console.log(VERSION)
    break
  default:
    printHelp()
    process.exit(1)
}
