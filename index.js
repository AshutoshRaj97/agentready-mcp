#!/usr/bin/env node
// AgentReady MCP bridge
// Connects Claude Desktop (stdio) to AgentReady's hosted MCP server (HTTP)
// Usage: npx @agentreadyweb/mcp

const MCP_URL = process.env.AGENTREADY_MCP_URL || 'https://www.agentready.it.com/api/mcp'

let pending = 0
let stdinEnded = false

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
        'User-Agent': '@agentreadyweb/mcp/1.0.4',
      },
      body: JSON.stringify(msg),
    })
    if (isNotification || res.status === 202) return
    const data = await res.json()
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
    try { forward(JSON.parse(line)) } catch {}
  }
})

process.stdin.on('end', () => {
  stdinEnded = true
  tryExit()
})
