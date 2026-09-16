# remote-decision-bridge

Relays decisions and status updates between Claude Code sessions and Telegram.

- `mcp-server/` is the MCP server a session runs. It provides `ask_remote` and `notify_remote`.
- `worker/` is the Cloudflare Worker the MCP server calls. It stores questions in KV, sends them to Telegram, and receives button taps and replies on the Telegram webhook.

## Worker API

Every route except the webhook requires `Authorization: Bearer <BRIDGE_SECRET>`.

| Route | Body / result |
|-------|---------------|
| `POST /question` | `{ text, options[], sessionId, project?, timeout?, recipients? }` → `201 { questionId }` |
| `GET /answer/:id` | `200 { questionId, answer, answeredAt }`, `204` while pending, `404` once expired |
| `POST /notify` | `{ text, sessionId, project?, severity?, recipients? }` → `200 { ok: true }` |
| `POST /webhook/telegram` | Telegram updates. Checked against `WEBHOOK_SECRET` when that secret is set. |

### Recipients

`recipients` is an optional array of **recipient ids**. You list ids, not chat ids.

- **Absent or empty:** the message goes to `TELEGRAM_CHAT_ID`, exactly as before recipients existed. Existing callers need no change.
- **Present:** every id must appear in the `TELEGRAM_RECIPIENTS` allow-list. The message is sent once to each resolved chat; two ids for the same chat deliver once.
- **Unknown id:** the request is rejected with `400 { "error": "Unknown recipient(s): <ids>" }` and nothing is sent or stored. The allow-list is what stops a caller holding the bridge secret from messaging an arbitrary chat.

A question sent to several recipients is decided **once**. The first answer from any recipient's chat is recorded and confirmed in every chat the question reached. A later answer changes nothing, and its chat is told which answer stands. Answers are stored in KV, which is eventually consistent, so two taps within the same moment from different chats can still race. "Once" covers answers that arrive after the first one has been stored.

## Configuration

`[vars]` in `worker/wrangler.toml`:

- `TELEGRAM_CHAT_ID`: the default chat.

Secrets (set with `wrangler secret put <NAME>` from `worker/`):

- `TELEGRAM_BOT_TOKEN`
- `BRIDGE_SECRET`: shared with the MCP server
- `WEBHOOK_SECRET` (optional): the `secret_token` given to Telegram's `setWebhook`
- `TELEGRAM_RECIPIENTS` (optional): the recipient allow-list, a JSON object mapping each recipient id to its chat id:

  ```bash
  cd worker
  printf '%s' '{"paul":"7847771855","ops":"-1001234567890"}' | npx wrangler secret put TELEGRAM_RECIPIENTS
  ```

  If the allow-list is unset or not valid JSON, every request that names recipients is rejected. Requests without `recipients` still work.

## Development

```bash
pnpm install
cd worker
pnpm test          # vitest
pnpm type-check
npx wrangler deploy
```
