# Product Specification: Remote Decision Bridge

> **Version**: 1.0
> **Created**: 2026-02-13
> **Last Updated**: 2026-02-13
> **Owner**: Paul Irving
> **Status**: approved

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-02-13 | Paul Irving | Initial draft |
| 1.0 | 2026-02-13 | Paul Irving | Resolved open questions; approved |

---

## 1. Product Overview

### 1.1 Purpose

Remote Decision Bridge enables Claude Code to send decision questions to the user's phone via Telegram during autonomous coding sessions, allowing the user to answer without returning to the terminal.

### 1.2 Background

When Claude Code runs autonomously (Level 3 automation), it occasionally encounters decisions that require human input — architecture choices, ambiguous requirements, permission confirmations. Currently, these block the session until the user returns to the terminal. Remote Decision Bridge eliminates this bottleneck by routing questions to Telegram, where the user can respond from anywhere.

### 1.3 Product Statement

**For** a solo developer running Claude Code autonomously
**Who** needs to unblock AI coding sessions without being at the terminal
**The** Remote Decision Bridge **is a** MCP server + Cloudflare Worker system
**That** delivers decision questions to Telegram and returns answers to Claude Code
**Unlike** checking the terminal periodically or staying desk-bound
**Our product** enables truly autonomous sessions with asynchronous human-in-the-loop decisions

## 2. Users and Stakeholders

### 2.1 Target Users

#### Primary User: Solo Developer (Paul Irving)

| Attribute | Description |
|-----------|-------------|
| **Who** | Developer running Claude Code in autonomous mode across multiple projects |
| **Goals** | Unblock autonomous sessions remotely; maintain velocity while AFK |
| **Pain Points** | Sessions stall on decisions; must be at terminal to respond; lost context when returning late |
| **Tech Proficiency** | Expert |
| **Usage Frequency** | Daily |

### 2.2 Stakeholders

| Stakeholder | Interest | Influence |
|-------------|----------|-----------|
| Paul Irving | Sole developer, user, and operator | High |

## 3. Core Capabilities

### 3.1 Capability Overview

| ID | Capability | Priority | Status |
|----|------------|----------|--------|
| CAP-01 | Remote Question Delivery | Must Have | Proposed |
| CAP-02 | Remote Answer Collection | Must Have | Proposed |
| CAP-03 | Status Notifications | Must Have | Proposed |
| CAP-04 | Secure Communication | Must Have | Proposed |
| CAP-05 | Session Context | Should Have | Proposed |
| CAP-06 | Question Timeout & Expiry | Should Have | Proposed |

### 3.2 Capability Details

#### CAP-01: Remote Question Delivery

**Description**: Claude Code sends decision questions to the user via Telegram, including context, the question text, and predefined answer options as inline buttons.

**User Value**: See what Claude Code needs without being at the terminal.

**Key Behaviors**:
- MCP server exposes an `ask_remote` tool that Claude Code can call
- Questions are sent to Cloudflare Worker via HTTP, stored in KV, and forwarded to Telegram
- Telegram message includes question text, context, and inline keyboard buttons for predefined options
- Supports both multiple-choice (buttons) and free-text responses

**Success Criteria**:
- Question appears on Telegram within 3 seconds of Claude Code calling the tool
- Message includes all context provided by Claude Code
- Inline buttons render correctly for predefined options

**Drives Requirements**: *(to be linked after requirements are created)*

---

#### CAP-02: Remote Answer Collection

**Description**: User taps a button or types a reply on Telegram; the answer flows back to Claude Code's MCP server, which returns it as the tool result.

**User Value**: Unblock Claude Code with a single tap from anywhere.

**Key Behaviors**:
- Telegram webhook receives button taps and text replies
- Answer is stored in KV keyed by question ID
- MCP server polls the Worker's `/answer/:id` endpoint until an answer arrives
- Tool call resolves with the user's answer, allowing Claude Code to continue

**Success Criteria**:
- Answer reaches Claude Code within 5 seconds of user tapping a button
- Free-text replies are captured and returned correctly
- MCP server poll interval is configurable (default 2s)

**Drives Requirements**: *(to be linked after requirements are created)*

---

#### CAP-03: Status Notifications

**Description**: Claude Code can send fire-and-forget status messages to Telegram (e.g., "Build succeeded", "Tests passing", "Deployment complete") without expecting a response.

**User Value**: Stay informed about session progress without checking the terminal.

**Key Behaviors**:
- MCP server exposes a `notify_remote` tool
- Notifications are sent to Telegram via the Worker's `/notify` endpoint
- No response is expected or waited for
- Messages are formatted as simple text notifications

**Success Criteria**:
- Notification appears on Telegram within 3 seconds
- Tool call returns immediately (does not block Claude Code)
- Messages are visually distinct from questions

**Drives Requirements**: *(to be linked after requirements are created)*

---

#### CAP-04: Secure Communication

**Description**: All communication between MCP server and Worker is authenticated with a shared secret. Only the configured Telegram chat ID receives messages.

**User Value**: Prevent unauthorized access to the decision bridge.

**Key Behaviors**:
- Shared `BRIDGE_SECRET` is included in all MCP-to-Worker requests
- Worker validates the secret before processing any request
- Telegram messages are only sent to the configured `TELEGRAM_CHAT_ID`
- Webhook endpoint validates that callbacks originate from Telegram

**Success Criteria**:
- Requests without valid secret return 401
- Messages are never sent to wrong chat
- Secrets are never logged or exposed in responses

**Drives Requirements**: *(to be linked after requirements are created)*

---

#### CAP-05: Session Context

**Description**: Questions and notifications include session context (project name, session ID) so the user knows which Claude Code session is asking.

**User Value**: Disambiguate when running multiple autonomous sessions.

**Key Behaviors**:
- MCP server includes a `BRIDGE_SESSION_ID` with each request
- Telegram messages display session/project context
- Session ID defaults to a timestamp if not configured

**Success Criteria**:
- Session context is visible in every Telegram message
- Multiple concurrent sessions produce distinguishable messages

**Drives Requirements**: *(to be linked after requirements are created)*

---

#### CAP-06: Question Timeout & Expiry

**Description**: Questions that go unanswered expire after a configurable timeout, allowing Claude Code to handle the timeout gracefully.

**User Value**: Sessions don't hang indefinitely waiting for a response.

**Key Behaviors**:
- MCP server has a configurable `BRIDGE_TIMEOUT_MS` (default 600000ms / 10 min)
- KV entries have a TTL so stale questions are cleaned up
- Tool call returns a timeout indicator if no answer is received

**Success Criteria**:
- Timeout is configurable via environment variable
- Claude Code receives a clear timeout signal (not an error)
- Expired KV entries are automatically cleaned up

**Drives Requirements**: *(to be linked after requirements are created)*

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Requirement | Measurement |
|--------|-------------|-------------|
| Question delivery latency | < 3 seconds | Time from MCP tool call to Telegram message |
| Answer round-trip | < 5 seconds | Time from button tap to tool result |
| Worker cold start | < 100ms | Cloudflare Workers p99 |

### 4.2 Security

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Shared Secret Auth | All MCP-to-Worker requests authenticated via BRIDGE_SECRET | Must Have |
| Chat ID Restriction | Messages only sent to configured TELEGRAM_CHAT_ID | Must Have |
| No Secret Logging | Secrets never appear in logs or responses | Must Have |
| HTTPS Only | All Worker endpoints served over HTTPS | Must Have |

### 4.3 Accessibility

Not applicable — Telegram is the user interface; accessibility is handled by the Telegram client.

### 4.4 Scalability

| Dimension | Current Need | Future Need | Notes |
|-----------|--------------|-------------|-------|
| Users | 1 | 1 | Personal tool |
| Concurrent sessions | 1-3 | 1-3 | Multiple projects |
| Questions/day | ~10-50 | ~10-50 | |

### 4.5 Compatibility

| Platform/Environment | Support Level | Notes |
|---------------------|---------------|-------|
| macOS (Claude Code host) | Required | Primary dev machine |
| Cloudflare Workers | Required | Worker runtime |
| Telegram (iOS/Android/Desktop) | Required | User-facing interface |

### 4.6 Maintainability

| Aspect | Requirement |
|--------|-------------|
| Code Standards | TypeScript strict mode |
| Test Coverage | Key paths covered with Vitest |
| Deployment | Single `pnpm deploy` command |

## 5. Constraints

### 5.1 Technical Constraints

| Constraint | Description | Rationale |
|------------|-------------|-----------|
| MCP stdio transport | MCP server must use stdio (not HTTP) | Claude Code launches MCP servers via stdio |
| Cloudflare KV | State storage limited to KV (no D1/Durable Objects for v1) | Simplicity; KV is sufficient for ephemeral question state |
| Polling for answers | MCP server polls Worker for answers (no WebSocket) | stdio transport doesn't support push; Worker can't push to local process |
| Telegram Bot API | Limited to Telegram Bot API capabilities | Inline keyboards, text messages, webhook callbacks |

### 5.2 Business Constraints

| Constraint | Description | Rationale |
|------------|-------------|-----------|
| Solo developer | Single person builds and maintains | Personal project |
| Free tier | Should run within Cloudflare free tier limits | Cost efficiency |
| Existing infra | Uses existing Cloudflare account and Telegram | No new service signups |

### 5.3 Regulatory/Compliance

None — personal tool, no user data beyond the developer's own messages.

## 6. Assumptions

| ID | Assumption | Risk if Wrong | Validation |
|----|------------|---------------|------------|
| A-01 | Telegram Bot API is reliable and low-latency | Questions don't reach user | Monitor delivery in testing |
| A-02 | Cloudflare Workers KV is fast enough for polling | High latency on answer retrieval | Test poll round-trip times |
| A-03 | Claude Code will call MCP tools during autonomous sessions | Bridge is never used | Test with Level 3 automation |
| A-04 | 10-minute default timeout is sufficient for most decisions | Sessions timeout unnecessarily | Make timeout configurable |

## 7. Dependencies

### 7.1 External Dependencies

| Dependency | Type | Owner | Risk Level |
|------------|------|-------|------------|
| Telegram Bot API | Service | Telegram | Low |
| Cloudflare Workers | Service | Cloudflare | Low |
| Cloudflare KV | Service | Cloudflare | Low |
| @modelcontextprotocol/sdk | Library | Anthropic | Medium |
| Hono | Library | Hono team | Low |

### 7.2 Internal Dependencies

| Dependency | Type | Status | Impact |
|------------|------|--------|--------|
| Claude Code MCP integration | System | Available | Core dependency — without it, tool can't be called |
| BoB automation framework | System | Active | Provides Level 3 automation context |

## 8. Scope

### 8.1 In Scope

| Item | Description | Priority |
|------|-------------|----------|
| MCP server with `ask_remote` tool | Sends questions, polls for answers | Must Have |
| MCP server with `notify_remote` tool | Sends fire-and-forget notifications | Must Have |
| Cloudflare Worker API | Routes for question, answer, webhook, notify | Must Have |
| Telegram bot integration | Send messages with inline keyboards, receive callbacks | Must Have |
| Shared secret authentication | Secure MCP-to-Worker communication | Must Have |
| KV-based question storage | Ephemeral state for pending questions | Must Have |
| Configurable timeouts | Polling interval and answer timeout | Should Have |
| Session identification | Distinguish messages from different sessions | Should Have |

### 8.2 Out of Scope

| Item | Reason | Future Phase? |
|------|--------|---------------|
| Multi-user support | Personal tool | No |
| Web dashboard | Telegram is sufficient | Maybe |
| Message history/audit log | Not needed for personal use | No |
| File/image attachments | Text decisions are sufficient | Maybe |
| Alternative messaging platforms (Slack, Discord) | Telegram is primary | Maybe |
| End-to-end encryption | HTTPS + shared secret is sufficient | No |

### 8.3 Scope Boundaries

**This product WILL**:
- Deliver decision questions from Claude Code to Telegram
- Collect answers via button taps or text replies
- Send status notifications to Telegram
- Authenticate all API communication
- Handle timeouts gracefully

**This product WILL NOT**:
- Replace Claude Code's built-in AskUserQuestion tool
- Store conversation history beyond KV TTL
- Support multiple users or chat groups
- Provide a web interface

## 9. Success Metrics

### 9.1 Key Performance Indicators

| KPI | Definition | Target | Measurement Method |
|-----|------------|--------|-------------------|
| Question delivery rate | % of questions that reach Telegram | 100% | Manual observation during use |
| Answer round-trip time | Time from button tap to Claude Code receiving answer | < 5s | Logs |
| Session unblock rate | % of sessions where bridge prevented a stall | > 80% of away-from-desk sessions | Qualitative |

### 9.2 Acceptance Criteria for MVP

- [ ] `ask_remote` tool sends question to Telegram with inline buttons
- [ ] Tapping a button returns the answer to Claude Code
- [ ] Free-text replies are supported
- [ ] `notify_remote` sends status messages without blocking
- [ ] Shared secret authentication works on all endpoints
- [ ] Unanswered questions timeout gracefully
- [ ] Setup works with documented checklist

## 10. Risks

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R-01 | Telegram API rate limits during heavy sessions | Low | Medium | Implement retry with backoff |
| R-02 | KV eventual consistency causes missed answers | Low | High | Use strong consistency reads if available; short TTL |
| R-03 | MCP SDK breaking changes | Medium | Medium | Pin to v1.x; test before upgrading |
| R-04 | Polling inefficiency wastes resources | Low | Low | Configurable interval; exponential backoff option |

*Note: Detailed risk tracking in RISK-NNNN documents after spec approval.*

## 11. Open Questions

| ID | Question | Owner | Due Date | Resolution |
|----|----------|-------|----------|------------|
| Q-01 | Should the bridge support message threading (reply chains)? | Paul | 2026-02-13 | **Yes — full threading.** Thread questions and their answers together, plus session-level grouping in Telegram. |
| Q-02 | Should notification messages include severity levels (info/warn/error)? | Paul | 2026-02-13 | **Yes — emoji prefixes.** Prefix notifications with emoji indicators (e.g. info, warning, error icons). |

## 12. Glossary

| Term | Definition |
|------|------------|
| MCP | Model Context Protocol — standard for connecting AI models to external tools |
| KV | Cloudflare Workers KV — key-value storage on the edge |
| Bridge | The full system: MCP server + Worker + Telegram bot |
| Decision question | A question from Claude Code that requires human input to proceed |
| Inline keyboard | Telegram feature that renders buttons below a message |

---

## Approval

### Specification Approval

| Role | Name | Decision | Date | Notes |
|------|------|----------|------|-------|
| Product Owner | Paul Irving | Approved | 2026-02-13 | Open questions resolved; spec approved at v1.0 |

### Approval Criteria

- [x] All open questions resolved
- [x] Stakeholders reviewed and aligned
- [x] Technical feasibility confirmed
- [x] Scope clearly defined
- [x] Success metrics agreed

---

## Next Steps

After specification approval:

1. [ ] Create requirements from capabilities using `/requirement propose`
2. [ ] Create risks from identified risks using `/risk create`
3. [ ] Build initial backlog using `/backlog add`
4. [ ] Begin sprint planning

---

## Traceability

### Capability → Requirement Mapping

*To be populated as requirements are created*

| Capability | Requirements |
|------------|--------------|
| CAP-01 | REQ-0021 (Remote Question Delivery) |
| CAP-02 | REQ-0022 (Remote Answer Collection) |
| CAP-03 | REQ-0023 (Status Notifications) |
| CAP-04 | REQ-0024 (Secure Communication) |
| CAP-05 | REQ-0025 (Session Context) |
| CAP-06 | REQ-0026 (Question Timeout & Expiry) |

### Linked Documents

- Requirements Index: `.claude/requirements/REQUIREMENTS-INDEX.md`
- Risk Register: `.claude/project-management/risks/`
