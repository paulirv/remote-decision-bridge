---
id: REQ-0026
title: Question Timeout & Expiry
created: 2026-02-13
updated: 2026-02-13
status: implemented
priority: should-have
category: feature
source: Product Spec v1.0
capability: CAP-06
tags: [mcp, kv, timeout]
solutions: [SOL-0003]
depends_on: [REQ-0021, REQ-0022]
blocked_by: []
related_to: [REQ-0020]
---

# REQ-0026: Question Timeout & Expiry

## Status

| Field | Value |
|-------|-------|
| **Status** | implemented |
| **Priority** | should-have |
| **Capability** | CAP-06 |
| **Parent** | REQ-0020 |
| **Proposed** | 2026-02-13 |
| **Approved** | 2026-02-13 |
| **Completed** | In Progress |

## Approval Record

| Date | Action | By | Notes |
|------|--------|----|-------|
| 2026-02-13 | Proposed | Paul Irving | Derived from approved product spec CAP-06 |
| 2026-02-13 | Approved | Paul Irving | Batch approved with all 6 RDB requirements |

## Summary

Questions that go unanswered expire after a configurable timeout, allowing Claude Code to handle the timeout gracefully rather than hanging indefinitely. KV entries have a TTL so stale questions are automatically cleaned up. The MCP server returns a clear timeout indicator (not an error) to Claude Code.

## Rationale

Without timeouts, an unanswered question blocks the Claude Code session indefinitely. Configurable timeouts let the session recover gracefully — Claude Code can make a default decision, skip the question, or try a different approach.

## User Story

As a solo developer
I want unanswered questions to timeout after a configurable period
So that my Claude Code sessions don't hang indefinitely if I miss a question

## Acceptance Criteria

**Progress: 4/4**

- ✅ AC-01: MCP server `BRIDGE_TIMEOUT_MS` is configurable via environment variable (default 600000ms / 10 min)
- ✅ AC-02: Tool call returns a clear timeout indicator (not an error) when no answer is received within the timeout
- ✅ AC-03: KV entries have a TTL so expired questions are automatically cleaned up
- ✅ AC-04: Timeout behavior is distinguishable from network errors or other failures

## Scope

### In Scope

- Configurable timeout in MCP server polling loop
- KV TTL on question entries
- Timeout response format (distinct from errors)
- Graceful timeout handling in `ask_remote` tool

### Out of Scope

- Timeout notification to Telegram ("your question expired")
- Automatic retry or escalation on timeout
- Dynamic timeout adjustment

## Dependencies

- REQ-0021 (Remote Question Delivery) — questions must exist to timeout
- REQ-0022 (Remote Answer Collection) — polling loop is where timeout occurs
- Cloudflare KV TTL support

## Non-Functional Requirements

- **Performance:** Timeout detection within one poll interval of the deadline
- **Security:** N/A
- **Scalability:** KV TTL handles cleanup automatically

## Notes

- Default timeout: 600000ms (10 minutes) per product spec
- KV TTL should be longer than the MCP timeout to avoid premature cleanup
- Timeout response should include the question ID and a clear `"status": "timeout"` indicator
- Consider exponential backoff on polling as the timeout approaches

## History

| Date | Event | By |
|------|-------|----|
| 2026-02-13 | Proposed as candidate | Paul Irving |
| 2026-02-13 | Approved for implementation | Paul Irving |
