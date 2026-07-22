import axios from "axios";
import { MAX_HISTORY_TURNS, trimHistory } from "./history.mjs";

export { MAX_HISTORY_TURNS, trimHistory };

/**
 * @typedef {import("./history.mjs").Role} Role
 * @typedef {import("./history.mjs").HistoryTurn} HistoryTurn
 */

/**
 * @typedef {Object} BotRequest
 * @property {string} message
 * @property {HistoryTurn[]} [history]
 */

/**
 * @typedef {Object} BotResponse
 * @property {Array<{ response: string }>} results
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number | null} status HTTP status, or null for transport failures.
   * @param {boolean} retryable 500s and network failures are; 400s are not.
   */
  constructor(message, status, retryable) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * @param {unknown} data
 * @returns {boolean} true if the body looks like `{ error: string }`
 */
function isApiErrorBody(data) {
  return (
    typeof data === "object" && data !== null && typeof data.error === "string"
  );
}

/**
 * POST a new turn to the bot, replaying prior turns as `history`.
 *
 * `message` is the NEW turn and must not also appear in `history` — sending it
 * twice makes the model see the question repeated.
 *
 * @param {string} message
 * @param {HistoryTurn[]} [history] prior turns, oldest first
 * @returns {Promise<string>} the assistant's reply text
 * @throws {ApiError} on validation failure, 4xx/5xx, or network error
 */
export async function sendMessage(message, history = []) {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new ApiError("Message cannot be empty.", null, false);
  }
  if (!BASE_URL) {
    throw new ApiError("NEXT_PUBLIC_API_BASE_URL is not set.", null, false);
  }

  /** @type {BotRequest} */
  const body = { message: trimmed };
  const turns = trimHistory(history);
  // Omit `history` entirely on the first turn rather than sending [].
  if (turns.length > 0) {
    body.history = turns;
  }

  try {
    const response = await axios.post(`${BASE_URL}/bot`, body, {
      headers: { "Content-Type": "application/json" },
    });

    const reply = response.data?.results?.[0]?.response;
    if (typeof reply !== "string") {
      throw new ApiError(
        "Malformed response: expected results[0].response to be a string.",
        response.status,
        true
      );
    }
    return reply;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? null;
      const data = error.response?.data;
      const reason = isApiErrorBody(data) ? data.error : error.message;

      // No response at all means the request never landed — retryable.
      if (status === null) {
        throw new ApiError(reason || "Network error.", null, true);
      }
      // 400 is a client bug (bad message/history shape); 5xx is upstream.
      throw new ApiError(reason, status, status >= 500);
    }

    throw new ApiError(
      error instanceof Error ? error.message : "Unknown error.",
      null,
      true
    );
  }
}
