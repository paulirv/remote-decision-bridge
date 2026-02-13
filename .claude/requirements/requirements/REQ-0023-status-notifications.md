---
id: REQ-0023
title: Status Notifications
created: 2026-02-13
updated: 2026-02-13
status: implemented
priority: must-have
category: feature
source: Product Spec v1.0
capability: CAP-03
tags: [mcp, telegram, notifications]
solutions: [SOL-0003]
depends_on: []
blocked_by: []
related_to: [REQ-0020, REQ-0024, REQ-0025]
---

# REQ-0023: Status Notifications

## Status

| Field | Value |
|-------|-------|
| **Status** | implemented |
| **Priority** | must-have |
| **Capability** | CAP-03 |
| **Parent** | REQ-0020 |
| **Proposed** | 2026-02-13 |
| **Approved** | 2026-02-13 |
| **Completed** | In Progress |

## Approval Record

| Date | Action | By | Notes |
|------|--------|----|-------|
| 2026-02-13 | Proposed | Paul Irving | Derived from approved product spec CAP-03 |
| 2026-02-13 | Approved | Paul Irving | Batch approved with all 6 RDB requirements |

## Summary

Claude Code can send fire-and-forget status messages to Telegram (e.g., "Build succeeded", "Tests passing", "Deployment complete") without expecting a response. The MCP `notify_remote` tool sends notifications through the Worker's `/notify` endpoint. Messages include emoji severity prefixes per the approved spec (Q-02 resolution).

## Rationale

Developers need to stay informed about session progress without checking the terminal. Notifications provide passive awareness of what Claude Code is doing, complementing the active decision-making of questions.

## User Story

As a solo developer away from my terminal
I want to receive status updates about my Claude Code session on Telegram
So that I stay informed about progress without interrupting my activities

## Acceptance Criteria

**Progress: 5/5**

- ✅ AC-01: MCP server exposes a `notify_remote` tool callable by Claude Code
- ✅ AC-02: Notifications are sent to Telegram via Worker's `POST /notify` endpoint
- ✅ AC-03: Tool call returns immediately without waiting for a response (fire-and-forget)
- ✅ AC-04: Notification messages are visually distinct from question messages
- ✅ AC-05: Notifications support emoji severity prefixes (info, warning, error)

## Scope

### In Scope

- MCP `notify_remote` tool definition and implementation
- Worker `/notify` POST endpoint
- Telegram message formatting for notifications
- Emoji severity level prefixes (info, warning, error)
- Fire-and-forget behavior (no response expected)

### Out of Scope

- Notification acknowledgement or read receipts
- Notification history/audit log
- Notification grouping or batching

## Dependencies

- REQ-0024 (Secure Communication) — authentication for `/notify` endpoint
- Telegram Bot API availability

## Non-Functional Requirements

- **Performance:** Notification appears on Telegram within 3 seconds
- **Security:** All requests authenticated via BRIDGE_SECRET
- **Scalability:** Handle burst notifications without rate limiting issues

## Notes

- Emoji prefixes (from Q-02 resolution): info, warning, error indicators
- Notifications should not trigger Telegram notification sounds differently than questions (Telegram controls this)
- Consider rate limiting to avoid Telegram API throttling during heavy notification bursts

## History

| Date | Event | By |
|------|-------|----|
| 2026-02-13 | Proposed as candidate | Paul Irving |
| 2026-02-13 | Approved for implementation | Paul Irving |
