import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";

/**
 * Spin up a throwaway server implementing the /bot contract, point the client
 * at it, and exercise the real axios request path + every response branch.
 * `sendMessage` reads BASE_URL at import time, so env must be set before the
 * dynamic import below.
 */
function startServer(handler) {
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => handler(req, res, raw ? JSON.parse(raw) : {}));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

test("sendMessage: 200 returns results[0].response and sends correct body", async () => {
  let received;
  const { server, port } = await startServer((req, res, body) => {
    received = body;
    json(res, 200, { results: [{ response: "Beautiful. 2007." }] });
  });
  process.env.NEXT_PUBLIC_API_BASE_URL = `http://127.0.0.1:${port}`;
  const { sendMessage } = await import(`../lib/api.js?200-${port}`);

  const reply = await sendMessage("who produced Graduation?", [
    { role: "user", content: "prev q" },
    { role: "assistant", content: "prev a" },
  ]);

  assert.equal(reply, "Beautiful. 2007.");
  assert.equal(received.message, "who produced Graduation?");
  assert.deepEqual(received.history, [
    { role: "user", content: "prev q" },
    { role: "assistant", content: "prev a" },
  ]);
  server.close();
});

test("sendMessage: first turn omits history entirely", async () => {
  let received;
  const { server, port } = await startServer((req, res, body) => {
    received = body;
    json(res, 200, { results: [{ response: "ok" }] });
  });
  process.env.NEXT_PUBLIC_API_BASE_URL = `http://127.0.0.1:${port}`;
  const { sendMessage } = await import(`../lib/api.js?first-${port}`);

  await sendMessage("first message");

  assert.equal(received.message, "first message");
  assert.ok(!("history" in received), "history should be omitted, not []");
  server.close();
});

test("sendMessage: 400 throws non-retryable ApiError with server reason", async () => {
  const { server, port } = await startServer((req, res) => {
    json(res, 400, { error: "history role must be user or assistant" });
  });
  process.env.NEXT_PUBLIC_API_BASE_URL = `http://127.0.0.1:${port}`;
  const { sendMessage, ApiError } = await import(`../lib/api.js?400-${port}`);

  await assert.rejects(sendMessage("bad"), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 400);
    assert.equal(err.retryable, false);
    assert.match(err.message, /history role/);
    return true;
  });
  server.close();
});

test("sendMessage: 500 throws retryable ApiError", async () => {
  const { server, port } = await startServer((req, res) => {
    json(res, 500, { error: "model exploded" });
  });
  process.env.NEXT_PUBLIC_API_BASE_URL = `http://127.0.0.1:${port}`;
  const { sendMessage, ApiError } = await import(`../lib/api.js?500-${port}`);

  await assert.rejects(sendMessage("hi"), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 500);
    assert.equal(err.retryable, true);
    return true;
  });
  server.close();
});

test("sendMessage: network failure throws retryable ApiError with null status", async () => {
  // Point at a closed port so the connection is refused.
  const { server, port } = await startServer(() => {});
  await new Promise((r) => server.close(r));
  process.env.NEXT_PUBLIC_API_BASE_URL = `http://127.0.0.1:${port}`;
  const { sendMessage, ApiError } = await import(`../lib/api.js?net-${port}`);

  await assert.rejects(sendMessage("hi"), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, null);
    assert.equal(err.retryable, true);
    return true;
  });
});

test("sendMessage: empty/whitespace message rejected before any request", async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:1";
  const { sendMessage, ApiError } = await import(`../lib/api.js?empty`);

  await assert.rejects(sendMessage("   "), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, null);
    assert.equal(err.retryable, false);
    return true;
  });
});

test("sendMessage: malformed 200 body (no results) throws", async () => {
  const { server, port } = await startServer((req, res) => {
    json(res, 200, { unexpected: true });
  });
  process.env.NEXT_PUBLIC_API_BASE_URL = `http://127.0.0.1:${port}`;
  const { sendMessage, ApiError } = await import(`../lib/api.js?malformed-${port}`);

  await assert.rejects(sendMessage("hi"), (err) => {
    assert.ok(err instanceof ApiError);
    assert.match(err.message, /Malformed response/);
    return true;
  });
  server.close();
});
