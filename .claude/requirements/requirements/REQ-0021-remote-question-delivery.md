---
id: REQ-0021
title: Remote Question Delivery
created: 2026-02-13
updated: 2026-02-13
status: implemented
priority: must-have
category: feature
source: Product Spec v1.0
capability: CAP-01
tags: [mcp, telegram, worker]
solutions: [SOL-0003]
depends_on: []
blocked_by: []
related_to: [REQ-0020, REQ-0022, REQ-0024]
---

# REQ-0021: Remote Question Delivery

## Status

| Field | Value |
|-------|-------|
| **Status** | implemented |
| **Priority** | must-have |
| **Capability** | CAP-01 |
| **Parent** | REQ-0020 |
| **Proposed** | 2026-02-13 |
| **Approved** | 2026-02-13 |
| **Completed** | In Progress |

## Approval Record

| Date | Action | By | Notes |
|------|--------|----|-------|
| 2026-02-13 | Proposed | Paul Irving | Derived from approved product spec CAP-01 |
| 2026-02-13 | Approved | Paul Irving | Batch approved with all 6 RDB requirements |

## Summary

Claude Code sends decision questions to the user via Telegram through the MCP `ask_remote` tool. Questions are forwarded to the Cloudflare Worker, stored in KV, and delivered to Telegram with inline keyboard buttons for predefined options and support for free-text responses.

## Rationale

When Claude Code runs autonomously, it encounters decisions requiring human input. Without remote delivery, sessions stall until the user returns to the terminal. This capability is the core "send" half of the bridge.

## User Story

As a solo developer running Claude Code autonomously
I want decision questions delivered to my Telegram
So that I can see what Claude Code needs without being at the terminal

## Acceptance Criteria

**Progress: 5/5**

- ✅ AC-01: MCP server exposes an `ask_remote` tool callable by Claude Code
- ✅ AC-02: Questions are sent to Cloudflare Worker via authenticated HTTP POST to `/question`
- ✅ AC-03: Worker stores question in KV and forwards to Telegram within 3 seconds
- ✅ AC-04: Telegram message includes question text, context, and inline keyboard buttons for predefined options
- ✅ AC-05: Both multiple-choice (buttons) and free-text response modes are supported

## Scope

### In Scope

- MCP `ask_remote` tool definition and implementation
- Worker `/question` POST endpoint
- KV storage of question state
- Telegram message formatting with inline keyboards
- Support for predefined options and free-text mode

### Out of Scope

- Answer collection (REQ-0022)
- File/image attachments in questions
- Message threading (addressed in CAP-05)

## Dependencies

- REQ-0024 (Secure Communication) — authentication must be in place
- Telegram Bot API availability
- Cloudflare Workers KV

## Non-Functional Requirements

- **Performance:** Question appears on Telegram within 3 seconds of tool call
- **Security:** All requests authenticated via BRIDGE_SECRET
- **Scalability:** Handle 10-50 questions/day

## Notes

- Inline keyboard buttons are limited by Telegram Bot API (max 8 buttons per row, text length limits)
- Question ID should be a UUID for uniqueness across sessions

## History

| Date | Event | By |
|------|-------|----|
| 2026-02-13 | Proposed as candidate | Paul Irving |
| 2026-02-13 | Approved for implementation | Paul Irving |
