# Remote Decision Bridge

REQ-0020 implementation. Sends Claude Code decision questions to Telegram during autonomous sessions.

## Architecture

```
Claude Code → MCP Server (stdio) → Cloudflare Worker + KV → Telegram Bot → User's Phone
                                                          ← Webhook callback ←
```

**Monorepo with two packages:**
- `worker/` — Cloudflare Worker (Hono + KV). Deployed to Cloudflare.
- `mcp-server/` — Local MCP server (stdio transport). Runs alongside Claude Code.

## Stack

- **Runtime:** Cloudflare Workers (Worker), Node.js (MCP server)
- **Framework:** Hono (Worker)
- **MCP SDK:** `@modelcontextprotocol/server` v2 with `StdioServerTransport`
- **Package manager:** pnpm (workspace)
- **Language:** TypeScript (strict)
- **Tests:** Vitest

## Key Files

| File | Purpose |
|------|---------|
| `worker/src/index.ts` | Hono app, route composition |
| `worker/src/routes/question.ts` | POST /question — receive from MCP, store in KV, send to Telegram |
| `worker/src/routes/answer.ts` | GET /answer/:id — MCP server polls here |
| `worker/src/routes/webhook.ts` | POST /webhook/telegram — button taps & text replies |
| `worker/src/routes/notify.ts` | POST /notify — fire-and-forget status messages |
| `worker/src/lib/telegram.ts` | Telegram Bot API client |
| `mcp-server/src/index.ts` | MCP server entry, stdio transport |
| `mcp-server/src/tools/ask-remote.ts` | `ask_remote` tool |
| `mcp-server/src/tools/notify-remote.ts` | `notify_remote` tool |
| `mcp-server/src/lib/bridge-client.ts` | HTTP client for Worker API |

## Environment Variables

### Worker (set via `wrangler secret put` or `.dev.vars`)
- `TELEGRAM_BOT_TOKEN` — from BotFather
- `BRIDGE_SECRET` — shared auth secret
- `TELEGRAM_CHAT_ID` — your chat ID (in wrangler.toml vars)

### MCP Server (env vars when launching)
- `BRIDGE_WORKER_URL` — Worker URL (e.g., `https://remote-decision-bridge.<account>.workers.dev`)
- `BRIDGE_SECRET` — must match Worker's secret
- `BRIDGE_SESSION_ID` — optional, defaults to timestamp
- `BRIDGE_POLL_INTERVAL_MS` — polling interval (default: 2000)
- `BRIDGE_TIMEOUT_MS` — answer timeout (default: 600000)

## Setup Checklist

1. Create Telegram bot via BotFather, get token
2. Get your chat ID (message the bot, check `/getUpdates`)
3. Create KV namespace: `wrangler kv namespace create QUESTIONS`
4. Fill in `wrangler.toml` KV IDs and `TELEGRAM_CHAT_ID`
5. Set secrets: `wrangler secret put TELEGRAM_BOT_TOKEN` and `wrangler secret put BRIDGE_SECRET`
6. Deploy: `pnpm deploy`
7. Set Telegram webhook: `curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://remote-decision-bridge.<account>.workers.dev/webhook/telegram"`
8. Add MCP server to Claude Code `settings.json`

## Conventions

- Branch naming: `feature/` for new functionality, `fix/` for bugs
- No `Co-Authored-By` in commit messages
