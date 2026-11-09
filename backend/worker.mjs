import manifest from "./allowed-pages.json" with { type: "json" };

const ORIGIN = "https://bradcocox.github.io";
const HOSTNAME = "bradcocox.github.io";
const ACTIVE_WINDOW_SECONDS = 120;
const MAX_BODY_BYTES = 16_384;
const COMMENT_PAGE_SIZE = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pages = new Set(manifest.pages);
const articles = new Set(manifest.articles);
const encoder = new TextEncoder();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const LIMITS = {
  pulse: [[MINUTE, 60], [HOUR, 1_500]],
  stats: [[MINUTE, 120]],
  reactionRead: [[MINUTE, 120]],
  reactionWrite: [[MINUTE, 10], [DAY, 100]],
  commentsRead: [[MINUTE, 60]],
  commentsWrite: [[HOUR, 5], [DAY, 15]],
};

class ApiError extends Error {
  constructor(status, code, message, retryAfter = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function invalid(message = "請檢查送出的資料。") {
  return new ApiError(400, "invalid_request", message);
}

function unavailable() {
  return new ApiError(503, "unavailable", "互動服務暫時無法使用，請稍後再試。", 60);
}

function reply(request, data, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Origin",
    ...extraHeaders,
  });
  if (request.headers.get("Origin") === ORIGIN) {
    headers.set("Access-Control-Allow-Origin", ORIGIN);
    headers.set("Access-Control-Expose-Headers", "Retry-After");
  }
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

function requireConfiguration(env) {
  if (
    env.FEATURES_ENABLED !== "true" ||
    !env.DB ||
    typeof env.SIGNING_SECRET !== "string" ||
    env.SIGNING_SECRET.length < 32
  ) {
    throw unavailable();
  }
}

function requireOrigin(request) {
  if (request.headers.get("Origin") !== ORIGIN) {
    throw new ApiError(403, "origin_not_allowed", "無法從這個來源使用互動服務。");
  }
}

function safePagePath(value) {
  return typeof value === "string" && value.length <= 400 &&
    value.startsWith("/brad-log/") && value.endsWith("/") &&
    !/[?#\\\s]/.test(value) && !value.includes("//") &&
    !/%(?:2f|5c|2e)/i.test(value) &&
    new URL(value, ORIGIN).pathname === value;
}

function createManifestLookup(manifestFetch, now) {
  let cache = { expires: 0, pages: new Set(), articles: new Set() };
  let pending;
  return async function lookup(value, isArticle) {
    if (cache.expires <= now()) {
      if (!pending) {
        pending = (async () => {
          // A fixed first-party URL prevents caller-controlled outbound requests.
          const next = { expires: now() + 5 * MINUTE, pages: new Set(), articles: new Set() };
          try {
            const response = await manifestFetch(`${ORIGIN}/brad-log/engagement-pages.json`, {
              signal: AbortSignal.timeout(5_000),
              redirect: "error",
            });
            if (!response.ok || !response.body || Number(response.headers.get("Content-Length")) > 65_536) {
              throw new Error("Manifest unavailable");
            }
            const reader = response.body.getReader();
            let size = 0;
            const chunks = [];
            try {
              while (true) {
                const { done, value: chunk } = await reader.read();
                if (done) break;
                size += chunk.byteLength;
                if (size > 65_536) {
                  await reader.cancel();
                  throw new Error("Manifest too large");
                }
                chunks.push(chunk);
              }
            } finally {
              reader.releaseLock();
            }
            const bytes = new Uint8Array(size);
            let offset = 0;
            for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
            const data = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
            if (!Array.isArray(data.pages) || !Array.isArray(data.articles) ||
                data.pages.length > 1_000 || data.articles.length > 1_000 ||
                !data.pages.every(safePagePath) || !data.articles.every(safePagePath)) {
              throw new Error("Invalid manifest");
            }
            const candidatePages = new Set(data.pages);
            if (!data.articles.every(path => path.startsWith("/brad-log/posts/") && candidatePages.has(path))) {
              throw new Error("Invalid article manifest");
            }
            next.pages = candidatePages;
            next.articles = new Set(data.articles);
          } catch {
            // Existing bundled pages keep working when GitHub Pages cannot be reached.
          }
          cache = next;
        })().finally(() => { pending = undefined; });
      }
      await pending;
    }
    return (isArticle ? cache.articles : cache.pages).has(value);
  };
}

async function requirePage(value, isArticle = false, lookup) {
  if (!safePagePath(value) ||
      (!(isArticle ? articles : pages).has(value) && !(lookup && await lookup(value, isArticle)))) {
    throw new ApiError(404, "unknown_page", "找不到這個頁面的互動資料。");
  }
  return value;
}

function requireUuid(value, field) {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw invalid(`${field} 格式不正確，請重新整理頁面。`);
  }
  return value.toLowerCase();
}

async function readJson(request) {
  const contentType = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new ApiError(415, "unsupported_content_type", "請使用 JSON 格式送出資料。");
  }
  const advertisedLength = Number(request.headers.get("Content-Length") || 0);
  if (advertisedLength > MAX_BODY_BYTES) {
    throw new ApiError(413, "request_too_large", "送出的內容過長。");
  }
  if (!request.body) throw invalid();
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "request_too_large", "送出的內容過長。");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, position);
    position += chunk.byteLength;
  }
  let data;
  try {
    data = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
  } catch {
    throw invalid("資料格式不正確，請重新送出。");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw invalid();
  return data;
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const result = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(result)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function utcDay(now) {
  return new Date(now).toISOString().slice(0, 10);
}

async function rateLimit(request, env, scope, now) {
  // Cloudflare sets this header on incoming requests. Do not trust X-Forwarded-For.
  const networkAddress = request.headers.get("CF-Connecting-IP");
  if (!networkAddress || networkAddress.length > 64) throw unavailable();
  const clientKey = await hmac(env.SIGNING_SECRET, `rate:${utcDay(now)}:${networkAddress}`);
  const limits = LIMITS[scope];
  const statements = limits.map(([duration, maximum]) => {
    const bucket = Math.floor(now / duration);
    return env.DB.prepare(`
      INSERT INTO rate_buckets (scope, client_key, bucket, hits, expires_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT (scope, client_key, bucket) DO UPDATE SET hits = hits + 1
        WHERE hits < ?
      RETURNING hits
    `).bind(`${scope}:${duration}`, clientKey, bucket, now + 2 * DAY, maximum);
  });
  const results = await env.DB.batch(statements);
  for (let index = 0; index < results.length; index++) {
    if (!results[index].results?.length) {
      const duration = limits[index][0];
      const retryAfter = Math.max(1, Math.ceil((duration - (now % duration)) / 1_000));
      throw new ApiError(429, "rate_limited", "操作較頻繁，請稍後再試。", retryAfter);
    }
  }
}

async function validateChallenge(token, action, env, now, verifyFetch) {
  if (typeof env.TURNSTILE_SECRET !== "string" || !env.TURNSTILE_SECRET) throw unavailable();
  if (typeof token !== "string" || !token || token.length > 2_048) {
    throw new ApiError(400, "verification_required", "請完成驗證後再送出。");
  }
  let verification;
  try {
    const response = await verifyFetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token }),
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok) throw new Error("Verification unavailable");
    verification = await response.json();
  } catch {
    throw unavailable();
  }
  const challengeTime = Date.parse(verification.challenge_ts);
  if (
    verification.success !== true ||
    verification.hostname !== HOSTNAME ||
    verification.action !== action ||
    !Number.isFinite(challengeTime) ||
    challengeTime < now - 330_000 ||
    challengeTime > now + 30_000
  ) {
    throw new ApiError(400, "verification_failed", "驗證已失效或未通過，請重新驗證。");
  }
}

async function getStats(env, pageId, now) {
  const since = now - ACTIVE_WINDOW_SECONDS * 1_000;
  const result = await env.DB.prepare(`
    SELECT
      COALESCE((SELECT visits FROM page_counters WHERE page_id = ?), 0) AS pageVisits,
      (SELECT visits FROM site_counters WHERE id = 1) AS siteVisits,
      (SELECT COUNT(*) FROM presence WHERE page_id = ? AND last_seen > ?) AS pageActive,
      (SELECT COUNT(DISTINCT session_key) FROM presence WHERE last_seen > ?) AS siteActive
  `).bind(pageId, pageId, since, since).first();
  if (!result || result.siteVisits === null) throw unavailable();
  return { ...result, activeWindowSeconds: ACTIVE_WINDOW_SECONDS, asOf: new Date(now).toISOString() };
}

async function pulse(request, env, data, now, lookup) {
  const pageId = await requirePage(data.pageId, false, lookup);
  const sessionId = requireUuid(data.sessionId, "sessionId");
  if (typeof data.visible !== "boolean") throw invalid();
  const viewId = data.viewId === undefined ? null : requireUuid(data.viewId, "viewId");
  await rateLimit(request, env, "pulse", now);
  if (!data.visible) return { accepted: true, asOf: new Date(now).toISOString() };

  const day = utcDay(now);
  const sessionKey = await hmac(env.SIGNING_SECRET, `presence:${day}:${sessionId}`);
  const statements = [];
  if (viewId) {
    // Article-specific key prevents collisions across pages; triggers increment once.
    const eventKey = await hmac(env.SIGNING_SECRET, `view:${pageId}:${viewId}`);
    statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO view_events (event_key, page_id, day, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(eventKey, pageId, day, now));
  }
  statements.push(env.DB.prepare(`
    INSERT INTO presence (page_id, session_key, last_seen) VALUES (?, ?, ?)
    ON CONFLICT (page_id, session_key) DO UPDATE SET last_seen = MAX(last_seen, excluded.last_seen)
  `).bind(pageId, sessionKey, now));
  await env.DB.batch(statements);
  return { accepted: true, asOf: new Date(now).toISOString() };
}

async function getReaction(env, articleId, visitorToken) {
  const visitorKey = await hmac(env.SIGNING_SECRET, `like:${articleId}:${visitorToken}`);
  const result = await env.DB.prepare(`
    SELECT
      COALESCE((SELECT likes FROM page_counters WHERE page_id = ?), 0) AS likes,
      EXISTS(SELECT 1 FROM reactions WHERE article_id = ? AND visitor_key = ?) AS liked
  `).bind(articleId, articleId, visitorKey).first();
  return { likes: result.likes, liked: result.liked === 1 };
}

async function setReaction(request, env, data, now, verifyFetch, lookup) {
  const articleId = await requirePage(data.articleId, true, lookup);
  const visitorToken = requireUuid(data.visitorToken, "visitorToken");
  if (typeof data.liked !== "boolean") throw invalid();
  await rateLimit(request, env, "reactionWrite", now);
  await validateChallenge(data.turnstileToken, "like", env, now, verifyFetch);
  const visitorKey = await hmac(env.SIGNING_SECRET, `like:${articleId}:${visitorToken}`);
  if (data.liked) {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO reactions (article_id, visitor_key, created_at) VALUES (?, ?, ?)
    `).bind(articleId, visitorKey, now).run();
  } else {
    await env.DB.prepare("DELETE FROM reactions WHERE article_id = ? AND visitor_key = ?")
      .bind(articleId, visitorKey).run();
  }
  return getReaction(env, articleId, visitorToken);
}

function decodeCursor(cursor) {
  if (cursor === null || cursor === "") return { time: 0, id: "" };
  if (cursor.length > 200 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw invalid("留言分頁資料不正確。");
  try {
    const value = JSON.parse(atob(cursor.replace(/-/g, "+").replace(/_/g, "/")));
    if (!Number.isSafeInteger(value.time) || value.time < 0 || !UUID.test(value.id)) throw new Error();
    return value;
  } catch {
    throw invalid("留言分頁資料不正確。");
  }
}

function encodeCursor(row) {
  return btoa(JSON.stringify({ time: row.created_at, id: row.id }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getComments(env, articleId, cursor) {
  const after = decodeCursor(cursor);
  const result = await env.DB.prepare(`
    SELECT id, nickname, body, created_at FROM comments
    WHERE article_id = ? AND status = 'approved'
      AND (created_at > ? OR (created_at = ? AND id > ?))
    ORDER BY created_at ASC, id ASC LIMIT ?
  `).bind(articleId, after.time, after.time, after.id, COMMENT_PAGE_SIZE + 1).all();
  const visible = result.results.slice(0, COMMENT_PAGE_SIZE);
  return {
    comments: visible.map(row => ({
      id: row.id,
      nickname: row.nickname,
      body: row.body,
      createdAt: new Date(row.created_at).toISOString(),
    })),
    nextCursor: result.results.length > COMMENT_PAGE_SIZE ? encodeCursor(visible.at(-1)) : null,
  };
}

function commentText(data) {
  if (data.nickname !== undefined && typeof data.nickname !== "string") throw invalid();
  if (typeof data.body !== "string") throw invalid("請填寫留言內容。");
  const nickname = (data.nickname || "").trim() || "訪客";
  const body = data.body.trim();
  if (Array.from(nickname).length > 32 || /[\u0000-\u001f\u007f]/.test(nickname)) {
    throw invalid("暱稱最多 32 個字，且不能包含控制字元。");
  }
  if (
    Array.from(body).length < 2 || Array.from(body).length > 2_000 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)
  ) {
    throw invalid("留言請填寫 2 至 2,000 個字。");
  }
  if (data.website !== undefined && data.website !== "") throw invalid();
  return { nickname, body };
}

async function createComment(request, env, data, now, verifyFetch, lookup) {
  const articleId = await requirePage(data.articleId, true, lookup);
  const mutationId = requireUuid(data.clientMutationId, "clientMutationId");
  const { nickname, body } = commentText(data);
  await rateLimit(request, env, "commentsWrite", now);
  const mutationKey = await hmac(env.SIGNING_SECRET, `comment:${articleId}:${mutationId}`);
  const fingerprint = await hmac(env.SIGNING_SECRET, JSON.stringify([articleId, nickname, body]));
  const previous = await env.DB.prepare("SELECT fingerprint FROM comments WHERE mutation_key = ?")
    .bind(mutationKey).first();
  if (previous) {
    if (previous.fingerprint !== fingerprint) {
      throw new ApiError(409, "mutation_conflict", "這次送出的資料已變更，請重新送出。");
    }
    return { status: "pending" };
  }
  await validateChallenge(data.turnstileToken, "comment", env, now, verifyFetch);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO comments
      (id, article_id, mutation_key, fingerprint, nickname, body, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).bind(crypto.randomUUID(), articleId, mutationKey, fingerprint, nickname, body, now).run();
  const stored = await env.DB.prepare("SELECT fingerprint FROM comments WHERE mutation_key = ?")
    .bind(mutationKey).first();
  if (stored?.fingerprint !== fingerprint) {
    throw new ApiError(409, "mutation_conflict", "這次送出的資料已變更，請重新送出。");
  }
  return { status: "pending" };
}

async function cleanup(env, now) {
  // Retention keeps running while interactive features are temporarily disabled.
  if (!env.DB) throw unavailable();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM presence WHERE last_seen <= ?").bind(now - 10 * MINUTE),
    env.DB.prepare("DELETE FROM view_events WHERE created_at <= ?").bind(now - 2 * DAY),
    env.DB.prepare("DELETE FROM rate_buckets WHERE expires_at <= ?").bind(now),
    env.DB.prepare("DELETE FROM comments WHERE status IN ('pending', 'rejected') AND created_at <= ?")
      .bind(now - 30 * DAY),
  ]);
}

// Dependency injection is only a local test seam; callers cannot choose these values.
export function createWorker({ now = () => Date.now(), verifyFetch = fetch, manifestFetch = fetch } = {}) {
  const lookup = createManifestLookup(manifestFetch, now);
  return {
    async fetch(request, env) {
      try {
        const url = new URL(request.url);
        const origin = request.headers.get("Origin");
        if (origin && origin !== ORIGIN) {
          throw new ApiError(403, "origin_not_allowed", "無法從這個來源使用互動服務。");
        }
        if (request.method === "OPTIONS") {
          requireOrigin(request);
          if (!/^\/v1\/(pulse|stats|reaction|comments)$/.test(url.pathname)) {
            throw new ApiError(404, "not_found", "找不到這個服務。");
          }
          return reply(request, null, 204, {
            "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
          });
        }
        requireConfiguration(env);
        if (request.method === "GET" && url.pathname === "/health") {
          if (typeof env.TURNSTILE_SECRET !== "string" || !env.TURNSTILE_SECRET) throw unavailable();
          const initialized = await env.DB.prepare("SELECT visits FROM site_counters WHERE id = 1").first();
          if (!initialized) throw unavailable();
          // A real challenge is still needed to verify the installed Turnstile key.
          return reply(request, { status: "configured" });
        }
        const time = now();
        if (request.method === "POST" && url.pathname === "/v1/pulse") {
          requireOrigin(request);
          return reply(request, await pulse(request, env, await readJson(request), time, lookup));
        }
        if (request.method === "GET" && url.pathname === "/v1/stats") {
          const pageId = await requirePage(url.searchParams.get("pageId"), false, lookup);
          await rateLimit(request, env, "stats", time);
          return reply(request, await getStats(env, pageId, time));
        }
        if (request.method === "GET" && url.pathname === "/v1/reaction") {
          const articleId = await requirePage(url.searchParams.get("articleId"), true, lookup);
          const token = requireUuid(url.searchParams.get("visitorToken"), "visitorToken");
          await rateLimit(request, env, "reactionRead", time);
          return reply(request, await getReaction(env, articleId, token));
        }
        if (request.method === "PUT" && url.pathname === "/v1/reaction") {
          requireOrigin(request);
          return reply(request, await setReaction(request, env, await readJson(request), time, verifyFetch, lookup));
        }
        if (request.method === "GET" && url.pathname === "/v1/comments") {
          const articleId = await requirePage(url.searchParams.get("articleId"), true, lookup);
          const cursor = url.searchParams.get("cursor");
          decodeCursor(cursor);
          await rateLimit(request, env, "commentsRead", time);
          return reply(request, await getComments(env, articleId, cursor));
        }
        if (request.method === "POST" && url.pathname === "/v1/comments") {
          requireOrigin(request);
          return reply(request, await createComment(request, env, await readJson(request), time, verifyFetch, lookup), 202);
        }
        throw new ApiError(404, "not_found", "找不到這個服務。");
      } catch (error) {
        // Never return D1 errors, SQL, IPs, verification tokens, or environment values.
        const safe = error instanceof ApiError ? error : unavailable();
        return reply(request, { error: { code: safe.code, message: safe.message } }, safe.status,
          safe.retryAfter ? { "Retry-After": String(safe.retryAfter) } : {});
      }
    },
    async scheduled(_controller, env) {
      // Quota exhaustion must not trigger a paid fallback or delete aggregate history.
      try {
        await cleanup(env, now());
      } catch {
        throw new Error("Community retention cleanup is temporarily unavailable.");
      }
    },
  };
}

export default createWorker();
