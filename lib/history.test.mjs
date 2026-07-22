import assert from "node:assert/strict";
import test from "node:test";
import { MAX_HISTORY_TURNS, buildHistory, trimHistory } from "./history.mjs";

/**
 * @param {string} id
 * @param {"user"|"assistant"} role
 * @param {string} content
 * @param {"pending"|"sent"|"failed"} status
 */
const msg = (id, role, content, status) => ({ id, role, content, status });

test("trimHistory keeps only the last N turns, oldest dropped", () => {
  const turns = Array.from({ length: 14 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `t${i}`,
  }));
  const trimmed = trimHistory(turns);
  assert.equal(trimmed.length, MAX_HISTORY_TURNS);
  assert.equal(trimmed[0].content, "t4"); // 14 - 10 = first kept is index 4
  assert.equal(trimmed.at(-1).content, "t13");
});

test("trimHistory returns input unchanged when under the limit", () => {
  const turns = [{ role: "user", content: "hi" }];
  assert.equal(trimHistory(turns), turns);
});

test("buildHistory strips local-only fields to { role, content }", () => {
  const messages = [
    msg("1", "user", "who produced Graduation?", "sent"),
    msg("2", "assistant", "Ye did.", "sent"),
  ];
  assert.deepEqual(buildHistory(messages), [
    { role: "user", content: "who produced Graduation?" },
    { role: "assistant", content: "Ye did." },
  ]);
});

test("buildHistory excludes pending and failed turns (no role desync)", () => {
  const messages = [
    msg("1", "user", "q1", "sent"),
    msg("2", "assistant", "a1", "sent"),
    msg("3", "user", "q2 that failed", "failed"),
  ];
  // Only the successful pair should be present — never two user turns in a row.
  assert.deepEqual(buildHistory(messages), [
    { role: "user", content: "q1" },
    { role: "assistant", content: "a1" },
  ]);
});

test("buildHistory with upToIndex excludes the retried message itself", () => {
  const messages = [
    msg("1", "user", "q1", "sent"),
    msg("2", "assistant", "a1", "sent"),
    msg("3", "user", "q2 failed, retrying", "failed"),
  ];
  // Retrying index 2: history is everything successful *before* it. The failed
  // message must not appear in its own history.
  const history = buildHistory(messages, 2);
  assert.deepEqual(history, [
    { role: "user", content: "q1" },
    { role: "assistant", content: "a1" },
  ]);
  assert.ok(!history.some((t) => t.content.includes("retrying")));
});

test("buildHistory never includes the in-flight (pending) message", () => {
  const messages = [
    msg("1", "user", "q1", "sent"),
    msg("2", "assistant", "a1", "sent"),
    msg("3", "user", "in flight", "pending"),
  ];
  // Snapshot taken at send time still shouldn't leak the pending turn.
  assert.deepEqual(buildHistory(messages), [
    { role: "user", content: "q1" },
    { role: "assistant", content: "a1" },
  ]);
});

test("buildHistory trims to the last 10 successful turns", () => {
  const messages = Array.from({ length: 24 }, (_, i) =>
    msg(String(i), i % 2 === 0 ? "user" : "assistant", `t${i}`, "sent")
  );
  const history = buildHistory(messages);
  assert.equal(history.length, MAX_HISTORY_TURNS);
  assert.equal(history.at(-1).content, "t23");
});

test("buildHistory never emits a system role", () => {
  const messages = [
    msg("1", "user", "q1", "sent"),
    msg("2", "assistant", "a1", "sent"),
  ];
  assert.ok(buildHistory(messages).every((t) => t.role !== "system"));
});

test("buildHistory on an empty conversation returns []", () => {
  assert.deepEqual(buildHistory([]), []);
});
