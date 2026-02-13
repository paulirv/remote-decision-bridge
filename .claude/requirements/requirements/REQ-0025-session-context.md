---
id: REQ-0025
title: Session Context
created: 2026-02-13
updated: 2026-02-13
status: implemented
priority: should-have
category: feature
source: Product Spec v1.0
capability: CAP-05
tags: [mcp, telegram, session, threading]
solutions: [SOL-0003]
depends_on: [REQ-0021, REQ-0023]
blocked_by: []
related_to: [REQ-0020]
---

# REQ-0025: Session Context

## Status

| Field | Value |
|-------|-------|
| **Status** | implemented |
| **Priority** | should-have |
| **Capability** | CAP-05 |
| **Parent** | REQ-0020 |
| **Proposed** | 2026-02-13 |
| **Approved** | 2026-02-13 |
| **Completed** | In Progress |

## Approval Record

| Date | Action | By | Notes |
|------|--------|----|-------|
| 2026-02-13 | Proposed | Paul Irving | Derived from approved product spec CAP-05; includes Q-01 resolution (full threading) |
| 2026-02-13 | Approved | Paul Irving | Batch approved with all 6 RDB requirements |

## Summary

Questions and notifications include session context (project name, session ID) so the user can distinguish which Claude Code session is asking. Messages use full Telegram threading: questions and their answers are threaded together, and messages from the same session are grouped. This implements the Q-01 resolution for full threading support.

## Rationale

When running multiple autonomous sessions across different projects, Telegram messages become confusing without session context. Threading keeps conversations organized and makes it easy to track which session each message belongs to.

## User Story

As a solo developer running multiple Claude Code sessions
I want each Telegram message to show which session/project it's from and be threaded by session
So that I can quickly identify and respond to the right session

## Acceptance Criteria

**Progress: 5/5**

- ✅ AC-01: MCP server includes `BRIDGE_SESSION_ID` with every request to the Worker
- ✅ AC-02: Telegram messages display session/project context in a header or prefix
- ✅ AC-03: Session ID defaults to a timestamp if `BRIDGE_SESSION_ID` is not configured
- ✅ AC-04: Questions and their answers are threaded together using Telegram reply-to
- ✅ AC-05: Multiple concurrent sessions produce visually distinguishable messages

## Scope

### In Scope

- Session ID inclusion in all MCP-to-Worker requests
- Session context display in Telegram messages
- Default session ID generation (timestamp-based)
- Telegram message threading (reply-to for answers, session grouping)

### Out of Scope

- Session management UI
- Session history or persistence beyond KV TTL
- Cross-session message linking

## Dependencies

- REQ-0021 (Remote Question Delivery) — messages need to exist to add context
- REQ-0023 (Status Notifications) — notifications also need session context
- Telegram Bot API reply-to message support

## Non-Functional Requirements

- **Performance:** No measurable impact on message delivery latency
- **Security:** Session ID is not a secret (informational only)
- **Scalability:** Support 1-3 concurrent sessions

## Notes

- Q-01 resolution: Full threading — thread questions and their answers together, plus session-level grouping
- Telegram `reply_to_message_id` parameter enables threading
- Consider using message_thread_id for topic-based threading if the chat supports it
- Session ID format suggestion: `{project-name}-{timestamp}` for readability

## History

| Date | Event | By |
|------|-------|----|
| 2026-02-13 | Proposed as candidate | Paul Irving |
| 2026-02-13 | Approved for implementation | Paul Irving |
