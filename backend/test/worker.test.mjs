import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createWorker } from "../worker.mjs";

const ORIGIN = "https://bradcocox.github.io";
const PAGE = "/brad-log/posts/github-pages-astropaper-guide/";
const HOME = "/brad-log/";
const NOW = Date.parse("2026-11-09T03:00:00.000Z");
const schema = readFileSync(new URL("../migrations/0001_community.sql", import.meta.url), "utf8");

// Runs actual SQLite SQL and triggers with the D1 prepared-statement interface.
// It does not emulate Cloudflare's network, CPU accounting, or production quota.
class D1TestDatabase {
  constructor() {
    this.raw = new DatabaseSync(":memory:");
    this.raw.exec(schema);
  }
  prepare(sql) {
    const db = this.raw;
    function statement(args = []) {
      return {
        bind(...values) { return statement(values); },
        execute() { return db.prepare(sql).all(...args).map(row => ({ ...row })); },
        async all() { return { success: true, results: this.execute() }; },
        async first(column) {
          const row = this.execute()[0] ?? null;
          return column && row ? row[column] : row;
        },
        async run() {
          const result = db.prepare(sql).run(...args);
          return { success: true, results: [], meta: { changes: Number(result.changes) } };
        },
      };
    }
    return statement();
  }
  async batch(statements) {
    this.raw.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map(statement => ({ success: true, results: statement.execute() }));
      this.raw.exec("COMMIT");
      return results;
    } catch (error) {
      this.raw.exec("ROLLBACK");
      throw error;
    }
  }
  count(table) { return this.raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n; }
  close() { this.raw.close(); }
}

function fixture(t, options = {}) {
  const db = new D1TestDatabase();
  t.after(() => db.close());
  let clock = NOW;
  const verificationCalls = [];
  const manifestCalls = [];
  const consumedTokens = new Set();
  const env = {
    DB: db,
    FEATURES_ENABLED: "true",
    SIGNING_SECRET: "unit-test".repeat(8),
    TURNSTILE_SECRET: "test-only",
  };
  const worker = createWorker({
    now: () => clock,
    verifyFetch: async (url, request) => {
      const payload = JSON.parse(request.body);
      verificationCalls.push({ url, payload });
      const [action, mode] = payload.response.split(":");
      const reused = consumedTokens.has(payload.response);
      consumedTokens.add(payload.response);
      if (mode === "offline") throw new Error("Provider failed with secret data");
      return Response.json({
        success: mode !== "fail" && !reused,
        hostname: mode === "host" ? "attacker.invalid" : "bradcocox.github.io",
        action: mode === "action" ? "unrelated" : action,
        challenge_ts: new Date(clock - (mode === "expired" ? 400_000 : 1_000)).toISOString(),
      });
    },
    manifestFetch: async (url, request) => {
      manifestCalls.push({ url, request });
      if (options.manifest) return Response.json(options.manifest());
      throw new Error("Offline test manifest");
    },
  });
  async function call(path, method = "GET", data = undefined, options = {}) {
    const headers = new Headers({ Origin: ORIGIN, "CF-Connecting-IP": "192.0.2.10", ...options.headers });
    if (options.removeOrigin) headers.delete("Origin");
    if (data !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const request = new Request(`https://community.example.workers.dev${path}`, {
      method,
      headers,
      body: options.rawBody ?? (data === undefined ? undefined : JSON.stringify(data)),
    });
    const response = await worker.fetch(request, { ...env, ...options.env });
    const text = await response.text();
    return { status: response.status, headers: response.headers, data: text ? JSON.parse(text) : null, text };
  }
  return {
    db, env, worker, call, verificationCalls, manifestCalls,
    advance(milliseconds) { clock += milliseconds; },
    time: () => clock,
  };
}

function challenge(action, mode = "ok") { return `${action}:${mode}:${crypto.randomUUID()}`; }
function pulseData(overrides = {}) {
  return { pageId: PAGE, sessionId: crypto.randomUUID(), viewId: crypto.randomUUID(), visible: true, ...overrides };
}
function commentData(overrides = {}) {
  return {
    articleId: PAGE,
    clientMutationId: crypto.randomUUID(),
    nickname: "讀者",
    body: "這份教學很清楚，謝謝分享！",
    website: "",
    turnstileToken: challenge("comment"),
    ...overrides,
  };
}
function reactionData(overrides = {}) {
  return {
    articleId: PAGE,
    visitorToken: crypto.randomUUID(),
    liked: true,
    turnstileToken: challenge("like"),
    ...overrides,
  };
}

test("write endpoints require exact origin; preflight permits only the configured origin", async t => {
  const f = fixture(t);
  assert.equal((await f.call("/v1/pulse", "POST", pulseData(), { removeOrigin: true })).status, 403);
  const denied = await f.call("/v1/pulse", "POST", pulseData(), { headers: { Origin: "https://attacker.invalid" } });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(f.db.count("view_events"), 0);
  const allowed = await f.call("/v1/pulse", "OPTIONS");
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.equal(allowed.headers.get("Access-Control-Allow-Headers"), "Content-Type");
  assert.equal(allowed.headers.get("Access-Control-Expose-Headers"), "Retry-After");
  assert.equal(allowed.headers.get("Access-Control-Allow-Credentials"), null);
});

test("unconfigured service and database failures return 503 without synthetic zero counts or raw errors", async t => {
  const f = fixture(t);
  const disabled = await f.call(`/v1/stats?pageId=${PAGE}`, "GET", undefined, { env: { FEATURES_ENABLED: "false" } });
  assert.equal(disabled.status, 503);
  assert.equal(disabled.data.error.code, "unavailable");
  assert.equal(disabled.data.pageVisits, undefined);
  const missingSecret = await f.call("/v1/pulse", "POST", pulseData(), { env: { SIGNING_SECRET: "" } });
  assert.equal(missingSecret.status, 503);
  const broken = { prepare() { throw new Error("database password and SQL must remain private"); } };
  const result = await f.call(`/v1/stats?pageId=${PAGE}`, "GET", undefined, { env: { DB: broken } });
  assert.equal(result.status, 503);
  assert.doesNotMatch(result.text, /password|SQL|stack|unit-test/);
});

test("body limits apply to streamed length, malformed JSON, and content types before database writes", async t => {
  const f = fixture(t);
  const huge = await f.call("/v1/comments", "POST", commentData({ body: "x".repeat(17_000) }));
  assert.equal(huge.status, 413);
  const invalid = await f.call("/v1/comments", "POST", {}, { rawBody: "{not-json" });
  assert.equal(invalid.status, 400);
  const contentType = await f.call("/v1/comments", "POST", commentData(), { headers: { "Content-Type": "text/plain" } });
  assert.equal(contentType.status, 415);
  assert.equal(f.db.count("comments"), 0);
  assert.equal(f.db.count("rate_buckets"), 0);
});

test("health requires the database schema and Turnstile configuration without claiming live verification", async t => {
  const f = fixture(t);
  assert.deepEqual((await f.call("/health")).data, { status: "configured" });
  assert.equal((await f.call("/health", "GET", undefined, { env: { TURNSTILE_SECRET: "" } })).status, 503);
  f.db.raw.exec("DROP TABLE site_counters");
  assert.equal((await f.call("/health")).status, 503);
});

test("unknown paths and invalid identities cannot create database rows or arbitrary outbound requests", async t => {
  const f = fixture(t);
  for (const pageId of ["https://attacker.invalid/", "/brad-log/../private/", "/brad-log/%2e%2e/private/", "/brad-log/new-nonexistent/"]) {
    assert.equal((await f.call("/v1/pulse", "POST", pulseData({ pageId }))).status, 404);
  }
  assert.equal((await f.call("/v1/pulse", "POST", pulseData({ sessionId: "not-an-id" }))).status, 400);
  assert.equal(f.db.count("presence"), 0);
  assert.equal(f.db.count("view_events"), 0);
  assert.equal(f.manifestCalls.length, 1);
  assert.equal(f.manifestCalls[0].url, `${ORIGIN}/brad-log/engagement-pages.json`);
  assert.equal(f.manifestCalls[0].request.redirect, "error");
});

test("view retries and concurrent duplicate requests increment cumulative and daily totals exactly once", async t => {
  const f = fixture(t);
  const event = pulseData();
  const results = await Promise.all(Array.from({ length: 15 }, () => f.call("/v1/pulse", "POST", event)));
  assert.ok(results.every(result => result.status === 200));
  assert.equal(f.db.count("view_events"), 1);
  assert.equal(f.db.raw.prepare("SELECT visits FROM site_counters WHERE id = 1").get().visits, 1);
  assert.equal(f.db.raw.prepare("SELECT visits FROM page_daily WHERE page_id = ?").get(PAGE).visits, 1);
  const heartbeat = { ...event };
  delete heartbeat.viewId;
  assert.equal((await f.call("/v1/pulse", "POST", heartbeat)).status, 200);
  const stats = await f.call(`/v1/stats?pageId=${PAGE}`);
  assert.equal(stats.data.pageVisits, 1);
  assert.equal(stats.data.siteVisits, 1);
});

test("presence deduplicates a browser across pages, expires after 120 seconds, and does not expose identifiers", async t => {
  const f = fixture(t);
  const sessionId = crypto.randomUUID();
  await f.call("/v1/pulse", "POST", pulseData({ sessionId }));
  await f.call("/v1/pulse", "POST", pulseData({ sessionId, pageId: HOME }));
  const stats = await f.call(`/v1/stats?pageId=${PAGE}`);
  assert.equal(stats.data.siteVisits, 2);
  assert.equal(stats.data.pageActive, 1);
  assert.equal(stats.data.siteActive, 1);
  assert.equal(stats.data.activeWindowSeconds, 120);
  assert.doesNotMatch(stats.text, new RegExp(sessionId));
  assert.deepEqual(Object.keys(stats.data).sort(), ["activeWindowSeconds", "asOf", "pageActive", "pageVisits", "siteActive", "siteVisits"]);
  f.advance(120_001);
  const expired = await f.call(`/v1/stats?pageId=${PAGE}`);
  assert.equal(expired.data.siteActive, 0);
  assert.equal(expired.data.siteVisits, 2);
});

test("a hidden tab pulse does not erase another visible tab or record a view", async t => {
  const f = fixture(t);
  const visible = pulseData();
  await f.call("/v1/pulse", "POST", visible);
  await f.call("/v1/pulse", "POST", { ...visible, visible: false, viewId: crypto.randomUUID() });
  const stats = await f.call(`/v1/stats?pageId=${PAGE}`);
  assert.equal(stats.data.pageVisits, 1);
  assert.equal(stats.data.pageActive, 1);
});

test("anonymous likes are idempotent and removable without negative or duplicate counters", async t => {
  const f = fixture(t);
  const visitorToken = crypto.randomUUID();
  const results = await Promise.all(Array.from({ length: 6 }, () =>
    f.call("/v1/reaction", "PUT", reactionData({ visitorToken }))));
  assert.ok(results.every(result => result.status === 200));
  assert.equal(f.db.count("reactions"), 1);
  const read = await f.call(`/v1/reaction?articleId=${PAGE}&visitorToken=${visitorToken}`);
  assert.deepEqual(read.data, { likes: 1, liked: true });
  for (let index = 0; index < 2; index++) {
    const removed = await f.call("/v1/reaction", "PUT", reactionData({ visitorToken, liked: false }));
    assert.deepEqual(removed.data, { likes: 0, liked: false });
  }
  assert.equal(f.db.count("reactions"), 0);
});

test("Turnstile verification enforces success, hostname, action, age, and single use", async t => {
  const f = fixture(t);
  for (const mode of ["fail", "host", "action", "expired"]) {
    const result = await f.call("/v1/reaction", "PUT", reactionData({ turnstileToken: challenge("like", mode) }));
    assert.equal(result.status, 400);
    assert.equal(result.data.error.code, "verification_failed");
  }
  assert.equal(f.db.count("reactions"), 0);
  const payload = reactionData();
  assert.equal((await f.call("/v1/reaction", "PUT", payload)).status, 200);
  assert.equal((await f.call("/v1/reaction", "PUT", { ...payload, visitorToken: crypto.randomUUID() })).status, 400);
  assert.equal(f.db.count("reactions"), 1);
  assert.ok(f.verificationCalls.every(call => Object.keys(call.payload).sort().join() === "response,secret"));
});

test("comments enter moderation and retries cannot publish or duplicate them", async t => {
  const f = fixture(t);
  const payload = commentData({ nickname: "" });
  const first = await f.call("/v1/comments", "POST", payload);
  assert.equal(first.status, 202);
  assert.deepEqual(first.data, { status: "pending" });
  assert.equal((await f.call("/v1/comments", "POST", payload)).status, 202);
  assert.equal(f.verificationCalls.length, 1);
  assert.equal(f.db.count("comments"), 1);
  const stored = f.db.raw.prepare("SELECT nickname, status FROM comments").get();
  assert.equal(stored.nickname, "訪客");
  assert.equal(stored.status, "pending");
  const publicResult = await f.call(`/v1/comments?articleId=${PAGE}`);
  assert.deepEqual(publicResult.data, { comments: [], nextCursor: null });
  const changed = await f.call("/v1/comments", "POST", { ...payload, body: "不同的內容" });
  assert.equal(changed.status, 409);
});

test("concurrent comment retries store exactly one copy with the supplied text", async t => {
  const f = fixture(t);
  const mutationId = crypto.randomUUID();
  const results = await Promise.all(Array.from({ length: 3 }, () =>
    f.call("/v1/comments", "POST", commentData({ clientMutationId: mutationId }))));
  assert.ok(results.every(result => result.status === 202));
  assert.equal(f.db.count("comments"), 1);
});

test("only approved plain-text comments are public and pagination has no missing or repeated rows", async t => {
  const f = fixture(t);
  const insert = f.db.raw.prepare(`INSERT INTO comments
    (id, article_id, mutation_key, fingerprint, nickname, body, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const text = "<img src=x onerror=alert(1)> '); DROP TABLE comments; --";
  for (let index = 0; index < 23; index++) {
    insert.run(crypto.randomUUID(), PAGE, `test-${index}`, "fixture", "讀者", index === 0 ? text : `留言 ${index}`, "approved", NOW + index);
  }
  insert.run(crypto.randomUUID(), PAGE, "pending", "fixture", "待審", "不可公開", "pending", NOW + 100);
  insert.run(crypto.randomUUID(), PAGE, "rejected", "fixture", "拒絕", "不可公開", "rejected", NOW + 100);
  const first = await f.call(`/v1/comments?articleId=${PAGE}`);
  assert.equal(first.data.comments.length, 20);
  assert.equal(first.data.comments[0].body, text);
  assert.ok(first.data.nextCursor);
  assert.doesNotMatch(first.text, /mutation_key|fingerprint|不可公開/);
  const next = await f.call(`/v1/comments?articleId=${PAGE}&cursor=${first.data.nextCursor}`);
  assert.equal(next.data.comments.length, 3);
  assert.equal(next.data.nextCursor, null);
  assert.equal(new Set([...first.data.comments, ...next.data.comments].map(row => row.id)).size, 23);
  assert.equal(f.db.count("comments"), 25);
});

test("empty, oversized, control-character, honeypot and invalid cursor input is rejected", async t => {
  const f = fixture(t);
  for (const changes of [
    { body: " " }, { body: "a" }, { body: "a".repeat(2_001) },
    { body: "bad\u0000input" }, { nickname: "a".repeat(33) },
    { nickname: "line\nbreak" }, { website: "spam.example" },
  ]) {
    assert.equal((await f.call("/v1/comments", "POST", commentData(changes))).status, 400);
  }
  assert.equal((await f.call(`/v1/comments?articleId=${PAGE}&cursor=not_valid`)).status, 400);
  assert.equal(f.db.count("comments"), 0);
  assert.equal(f.verificationCalls.length, 0);
});

test("rate limits atomically cap concurrent comment attempts and return a useful retry window", async t => {
  const f = fixture(t);
  const results = await Promise.all(Array.from({ length: 8 }, () => f.call("/v1/comments", "POST", commentData())));
  assert.equal(results.filter(result => result.status === 202).length, 5);
  assert.equal(results.filter(result => result.status === 429).length, 3);
  assert.equal(f.db.count("comments"), 5);
  assert.equal(f.verificationCalls.length, 5);
  assert.equal(results.find(result => result.status === 429).headers.get("Retry-After"), "3600");
  f.advance(3_600_000);
  assert.equal((await f.call("/v1/comments", "POST", commentData())).status, 202);
});

test("temporary identifiers expire without deleting aggregate history or approved comments", async t => {
  const f = fixture(t);
  const payload = pulseData();
  await f.call("/v1/pulse", "POST", payload);
  await f.call("/v1/comments", "POST", commentData());
  await f.call("/v1/comments", "POST", commentData());
  f.db.raw.prepare("UPDATE comments SET status = 'approved' WHERE rowid = (SELECT MIN(rowid) FROM comments)").run();
  const presenceRow = f.db.raw.prepare("SELECT * FROM presence").get();
  assert.notEqual(presenceRow.session_key, payload.sessionId);
  assert.match(presenceRow.session_key, /^[0-9a-f]{64}$/);
  const buckets = f.db.raw.prepare("SELECT * FROM rate_buckets").all();
  assert.doesNotMatch(JSON.stringify(buckets), /192\.0\.2\.10/);
  f.advance(31 * 24 * 60 * 60_000);
  await f.worker.scheduled({}, { ...f.env, FEATURES_ENABLED: "false", SIGNING_SECRET: "" });
  assert.equal(f.db.count("presence"), 0);
  assert.equal(f.db.count("view_events"), 0);
  assert.equal(f.db.count("rate_buckets"), 0);
  assert.equal(f.db.count("comments"), 1);
  assert.equal(f.db.raw.prepare("SELECT status FROM comments").get().status, "approved");
  assert.equal(f.db.raw.prepare("SELECT visits FROM site_counters").get().visits, 1);
  assert.equal(f.db.raw.prepare("SELECT visits FROM page_daily").get().visits, 1);
});

test("newly published pages become valid through the trusted bounded manifest without worker redeployment", async t => {
  const fresh = "/brad-log/posts/a-new-lesson/";
  let remote = { pages: [HOME, PAGE], articles: [PAGE] };
  const f = fixture(t, { manifest: () => remote });
  assert.equal((await f.call("/v1/pulse", "POST", pulseData({ pageId: fresh }))).status, 404);
  remote = { pages: [HOME, PAGE, fresh], articles: [PAGE, fresh] };
  assert.equal((await f.call("/v1/pulse", "POST", pulseData({ pageId: fresh }))).status, 404);
  f.advance(5 * 60_000 + 1);
  assert.equal((await f.call("/v1/pulse", "POST", pulseData({ pageId: fresh }))).status, 200);
  assert.equal((await f.call("/v1/comments", "POST", commentData({ articleId: fresh }))).status, 202);
  assert.equal(f.manifestCalls.length, 2);
});

test("invalid or oversized remote manifests fail closed while existing bundled pages keep working", async t => {
  const fresh = "/brad-log/posts/unsafe-remote/";
  const invalid = fixture(t, { manifest: () => ({ pages: [fresh], articles: ["https://attacker.invalid/"] }) });
  assert.equal((await invalid.call("/v1/pulse", "POST", pulseData({ pageId: fresh }))).status, 404);
  assert.equal((await invalid.call("/v1/pulse", "POST", pulseData())).status, 200);
  const huge = fixture(t, { manifest: () => ({ pages: [fresh], articles: [fresh], extra: "x".repeat(70_000) }) });
  assert.equal((await huge.call("/v1/pulse", "POST", pulseData({ pageId: fresh }))).status, 404);
  const tooMany = fixture(t, { manifest: () => ({ pages: Array.from({ length: 1_001 }, () => fresh), articles: [fresh] }) });
  assert.equal((await tooMany.call("/v1/pulse", "POST", pulseData({ pageId: fresh }))).status, 404);
});
