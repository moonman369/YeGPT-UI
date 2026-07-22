import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, sendMessage as postMessage } from "../lib/api";
import { buildHistory } from "../lib/history.mjs";

/**
 * @typedef {import("../lib/history.mjs").Role} Role
 * @typedef {import("../lib/history.mjs").HistoryTurn} HistoryTurn
 */

/**
 * @typedef {"pending" | "sent" | "failed"} MessageStatus
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id stable local id — never sent to the API
 * @property {Role} role
 * @property {string} content
 * @property {MessageStatus} status
 */

const STORAGE_KEY = "yegpt:conversation";

/** Legacy key from the pre-multi-turn format, cleared on reset. */
const LEGACY_STORAGE_KEY = "messages";

/** @returns {string} */
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isChatMessage(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    (value.status === "pending" ||
      value.status === "sent" ||
      value.status === "failed")
  );
}

/**
 * Owns the conversation: message list, in-flight state, and the send/retry/reset
 * actions. The backend is stateless, so this is the single source of truth.
 *
 * @returns {{
 *   messages: ChatMessage[],
 *   isSending: boolean,
 *   error: string | null,
 *   send: (text: string) => void,
 *   retry: (id: string) => void,
 *   reset: () => void,
 * }}
 */
export function useConversation() {
  /** @type {[ChatMessage[], Function]} */
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  // Mirrors `isSending` for synchronous guarding — state updates are async, so
  // two rapid submits could both pass an `isSending` check and race.
  const inFlight = useRef(false);
  // Blocks the persist effect until the initial load has run, so the empty
  // starting state can't clobber stored history before it's read back.
  const hydrated = useRef(false);

  // Hydrate from localStorage on mount only (never during SSR, which would
  // cause a server/client markup mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Drop anything that didn't complete a round-trip: a pending message
          // persisted mid-flight has no reply and would corrupt history.
          setMessages(
            parsed.filter(isChatMessage).filter((m) => m.status === "sent")
          );
        }
      }
    } catch {
      // Corrupt payload — start clean rather than crashing the app.
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      hydrated.current = true;
    }
  }, []);

  // Persist only settled turns, for the same reason.
  useEffect(() => {
    if (!hydrated.current) return;
    const settled = messages.filter((m) => m.status === "sent");
    try {
      if (settled.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settled));
      }
    } catch {
      // Quota exceeded — history stays in memory for this session.
    }
  }, [messages]);

  /**
   * Shared send path for both a fresh message and a retry of a failed one.
   * @param {string} userMessageId
   * @param {string} text
   * @param {HistoryTurn[]} history
   */
  const dispatch = useCallback((userMessageId, text, history) => {
    inFlight.current = true;
    setIsSending(true);
    setError(null);

    postMessage(text, history)
      .then((reply) => {
        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === userMessageId ? { ...m, status: "sent" } : m
          ),
          {
            id: newId(),
            role: "assistant",
            content: reply,
            status: "sent",
          },
        ]);
      })
      .catch((err) => {
        const message =
          err instanceof ApiError ? err.message : "Something went wrong.";
        // Keep the user's message visible and failed so it can be retried.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessageId ? { ...m, status: "failed" } : m
          )
        );
        setError(message);
        if (err instanceof ApiError && err.status === 400) {
          // A 400 means we built a bad request — surface it loudly in dev.
          console.error("[YeGPT] Bad request:", message);
        }
      })
      .finally(() => {
        inFlight.current = false;
        setIsSending(false);
      });
  }, []);

  const send = useCallback(
    /** @param {string} text */
    (text) => {
      const trimmed = text.trim();
      if (!trimmed || inFlight.current) return;

      /** @type {ChatMessage} */
      const userMessage = {
        id: newId(),
        role: "user",
        content: trimmed,
        status: "pending",
      };

      // Snapshot history *before* appending — the new turn travels in
      // `message`, and must not also appear in `history`.
      const history = buildHistory(messages);
      setMessages((prev) => [...prev, userMessage]);
      dispatch(userMessage.id, trimmed, history);
    },
    [messages, dispatch]
  );

  const retry = useCallback(
    /** @param {string} id */
    (id) => {
      if (inFlight.current) return;

      const index = messages.findIndex((m) => m.id === id);
      const target = messages[index];
      if (!target || target.status !== "failed") return;

      // History is everything successful *before* this message, so the retried
      // turn isn't duplicated into its own context.
      const history = buildHistory(messages, index);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "pending" } : m))
      );
      dispatch(target.id, target.content, history);
    },
    [messages, dispatch]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, []);

  return { messages, isSending, error, send, retry, reset };
}
