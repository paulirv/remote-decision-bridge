---
id: REQ-0022
title: Remote Answer Collection
created: 2026-02-13
updated: 2026-02-13
status: implemented
priority: must-have
category: feature
source: Product Spec v1.0
capability: CAP-02
tags: [mcp, telegram, webhook, polling]
solutions: [SOL-0003]
depends_on: [REQ-0021]
blocked_by: []
related_to: [REQ-0020, REQ-0021, REQ-0026]
---

# REQ-0022: Remote Answer Collection

## Status

| Field | Value |
|-------|-------|
| **Status** | implemented |
| **Priority** | must-have |
| **Capability** | CAP-02 |
| **Parent** | REQ-0020 |
| **Proposed** | 2026-02-13 |
| **Approved** | 2026-02-13 |
| **Completed** | In Progress |

## Approval Record

| Date | Action | By | Notes |
|------|--------|----|-------|
| 2026-02-13 | Proposed | Paul Irving | Derived from approved product spec CAP-02 |
| 2026-02-13 | Approved | Paul Irving | Batch approved with all 6 RDB requirements |

## Summary

User taps a Telegram inline button or types a text reply; the answer flows back through the Telegram webhook to the Worker, is stored in KV, and is retrieved by the MCP server via polling. The `ask_remote` tool call resolves with the user's answer.

## Rationale

The "receive" half of the bridge. Without answer collection, questions are one-way notifications. This closes the loop so Claude Code can continue working with the user's decision.

## User Story

As a solo developer
I want to tap a button on Telegram and have my answer reach Claude Code
So that I can unblock autonomous sessions with a single tap from anywhere

## Acceptance Criteria

**Progress: 5/5**

- ✅ AC-01: Telegram webhook endpoint (`POST /webhook/telegram`) receives button callbacks and text replies
- ✅ AC-02: Answers are stored in KV keyed by question ID
- ✅ AC-03: MCP server polls Worker's `GET /answer/:id` endpoint until an answer arrives
- ✅ AC-04: Answer reaches Claude Code within 5 seconds of user tapping a button
- ✅ AC-05: Free-text replies via Telegram are captured and returned correctly

## Scope

### In Scope

- Telegram webhook handler for callback queries and text messages
- Worker `/answer/:id` GET endpoint
- KV answer storage keyed by question ID
- MCP server polling logic with configurable interval
- Tool call resolution with user's answer

### Out of Scope

- Question delivery (REQ-0021)
- Timeout handling (REQ-0026)
- Multi-answer or edit-answer flows

## Dependencies

- REQ-0021 (Remote Question Delivery) — questions must be sent before answers can come back
- REQ-0024 (Secure Communication) — webhook validation
- Telegram Bot API webhook support

## Non-Functional Requirements

- **Performance:** Answer round-trip < 5 seconds from button tap to tool result
- **Security:** Webhook validates Telegram origin
- **Scalability:** Polling interval configurable (default 2s)

## Notes

- MCP server poll interval configurable via `BRIDGE_POLL_INTERVAL_MS` (default 2000ms)
- Telegram callback_query must be acknowledged with `answerCallbackQuery` to remove loading state
- Text replies need to be associated with the correct question (reply-to message ID)

## History

| Date | Event | By |
|------|-------|----|
| 2026-02-13 | Proposed as candidate | Paul Irving |
| 2026-02-13 | Approved for implementation | Paul Irving |
