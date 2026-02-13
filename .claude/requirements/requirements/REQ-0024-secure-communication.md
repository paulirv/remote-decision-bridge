---
id: REQ-0024
title: Secure Communication
created: 2026-02-13
updated: 2026-02-13
status: implemented
priority: must-have
category: feature
source: Product Spec v1.0
capability: CAP-04
tags: [security, auth, worker]
solutions: [SOL-0003]
depends_on: []
blocked_by: []
related_to: [REQ-0020, REQ-0021, REQ-0022, REQ-0023]
---

# REQ-0024: Secure Communication

## Status

| Field | Value |
|-------|-------|
| **Status** | implemented |
| **Priority** | must-have |
| **Capability** | CAP-04 |
| **Parent** | REQ-0020 |
| **Proposed** | 2026-02-13 |
| **Approved** | 2026-02-13 |
| **Completed** | In Progress |

## Approval Record

| Date | Action | By | Notes |
|------|--------|----|-------|
| 2026-02-13 | Proposed | Paul Irving | Derived from approved product spec CAP-04 |
| 2026-02-13 | Approved | Paul Irving | Batch approved with all 6 RDB requirements |

## Summary

All communication between the MCP server and Cloudflare Worker is authenticated with a shared secret (`BRIDGE_SECRET`). The Worker validates this secret on every inbound request. Telegram messages are only sent to the configured `TELEGRAM_CHAT_ID`. The webhook endpoint validates that callbacks originate from Telegram.

## Rationale

Without authentication, anyone who discovers the Worker URL could send fake questions to Telegram or inject fake answers. Shared secret auth is the minimum viable security for a personal tool, combined with chat ID restriction.

## User Story

As a solo developer
I want all bridge communication to be authenticated
So that only my Claude Code sessions and my Telegram account can use the bridge

## Acceptance Criteria

**Progress: 4/4**

- ✅ AC-01: All MCP-to-Worker requests include `BRIDGE_SECRET` in an Authorization header
- ✅ AC-02: Worker returns 401 for requests with missing or invalid secret
- ✅ AC-03: Telegram messages are only sent to the configured `TELEGRAM_CHAT_ID`
- ✅ AC-04: Secrets are never logged or included in error responses

## Scope

### In Scope

- Shared secret validation middleware for all Worker endpoints
- Authorization header handling in MCP server HTTP client
- Chat ID restriction on outbound Telegram messages
- Secret redaction from logs and error responses

### Out of Scope

- End-to-end encryption
- Token rotation or expiry
- IP allowlisting
- Telegram webhook secret validation (nice-to-have, not required for v1)

## Dependencies

- Cloudflare Workers secret management (`wrangler secret put`)
- HTTPS (provided by Cloudflare by default)

## Non-Functional Requirements

- **Performance:** Auth check adds < 1ms to request processing
- **Security:** BRIDGE_SECRET stored as Cloudflare secret (not in code or wrangler.toml)
- **Scalability:** N/A — auth is stateless

## Notes

- BRIDGE_SECRET should be a cryptographically random string (e.g., `openssl rand -hex 32`)
- Consider adding Telegram webhook secret validation as a follow-up enhancement
- All Worker endpoints behind HTTPS by default via Cloudflare

## History

| Date | Event | By |
|------|-------|----|
| 2026-02-13 | Proposed as candidate | Paul Irving |
| 2026-02-13 | Approved for implementation | Paul Irving |
