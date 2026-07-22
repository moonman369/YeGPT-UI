/**
 * Pure conversation-history rules — no React, no network, no side effects.
 * Kept dependency-free so it can be unit-tested directly under node.
 */

/**
 * @typedef {"user" | "assistant"} Role
 * @typedef {"pending" | "sent" | "failed"} MessageStatus
 */

/**
 * @typedef {Object} HistoryTurn
 * @property {Role} role
 * @property {string} content
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {Role} role
 * @property {string} content
 * @property {MessageStatus} status
 */

/**
 * The server keeps only the last 10 history turns. We trim to the same limit
 * client-side so we don't ship turns that will be discarded on arrival.
 */
export const MAX_HISTORY_TURNS = 10;

/**
 * Keep only the most recent turns, preserving oldest-first order.
 * @param {HistoryTurn[]} history
 * @param {number} [limit]
 * @returns {HistoryTurn[]}
 */
export function trimHistory(history, limit = MAX_HISTORY_TURNS) {
  return history.length > limit ? history.slice(-limit) : history;
}

/**
 * Build the `history` payload for a send.
 *
 * Only turns that completed a successful round-trip are eligible: including a
 * pending or failed message would desync roles (e.g. two `user` turns in a row
 * with no assistant reply between them). Local-only fields such as `id` and
 * `status` are stripped — the API accepts exactly `{ role, content }`.
 *
 * @param {ChatMessage[]} messages
 * @param {number} [upToIndex] exclusive upper bound — used on retry so the
 *   message being resent is never duplicated into its own history.
 * @returns {HistoryTurn[]}
 */
export function buildHistory(messages, upToIndex = messages.length) {
  const turns = messages
    .slice(0, upToIndex)
    .filter((m) => m.status === "sent")
    .map((m) => ({ role: m.role, content: m.content }));

  return trimHistory(turns, MAX_HISTORY_TURNS);
}
