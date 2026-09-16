import type { Env } from '../types.js';

export type RecipientResolution =
  | { ok: true; chatIds: string[] }
  | { ok: false; error: string };

/**
 * Resolve a request's `recipients` to Telegram chat ids.
 *
 * Absent (or an empty list) means the default chat, TELEGRAM_CHAT_ID — the
 * behaviour every caller had before recipients existed. Otherwise every id must
 * appear in the TELEGRAM_RECIPIENTS allow-list, so a caller holding the bridge
 * secret cannot message an arbitrary chat. Unknown ids are named in the error.
 * Chat ids are de-duplicated, so two ids for one chat deliver once.
 */
export function resolveRecipients(env: Env, recipients: unknown): RecipientResolution {
  if (recipients === undefined || recipients === null) {
    return { ok: true, chatIds: [env.TELEGRAM_CHAT_ID] };
  }
  if (!Array.isArray(recipients) || recipients.some((r) => typeof r !== 'string' || r === '')) {
    return { ok: false, error: 'recipients must be an array of recipient ids' };
  }
  if (recipients.length === 0) {
    return { ok: true, chatIds: [env.TELEGRAM_CHAT_ID] };
  }

  const allowList = parseAllowList(env.TELEGRAM_RECIPIENTS);
  const unknown = recipients.filter((id) => !Object.prototype.hasOwnProperty.call(allowList, id));
  if (unknown.length) {
    return { ok: false, error: `Unknown recipient(s): ${[...new Set(unknown)].join(', ')}` };
  }
  return { ok: true, chatIds: [...new Set(recipients.map((id) => allowList[id]))] };
}

function parseAllowList(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [id, chat] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof chat === 'string' || typeof chat === 'number') out[id] = String(chat);
    }
    return out;
  } catch {
    console.error('TELEGRAM_RECIPIENTS is not valid JSON — every named recipient is rejected');
    return {};
  }
}
