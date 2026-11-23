// Read-only production contract: freshly published HTML -> trusted manifest -> Worker.
import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

const ORIGIN = "https://bradcocox.github.io";
const API = "https://brad-log-community.bradcocox.workers.dev";
const manifestUrl = `${ORIGIN}/brad-log/engagement-pages.json`;
const expected = JSON.parse(await readFile(new URL("../dist/engagement-pages.json", import.meta.url), "utf8"));
const expectedArticles = new Set(expected.articles);
if (!expectedArticles.size) throw new Error("Build has no articles; refusing an empty smoke test.");

async function readJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(12_000),
    redirect: "error",
  });
  let body = null;
  try { body = await response.json(); } catch { /* HTTP status still reported. */ }
  return { response, body };
}

async function verify() {
  const published = await readJson(manifestUrl);
  if (!published.response.ok || !Array.isArray(published.body?.articles)) {
    throw new Error(`Public manifest unavailable (HTTP ${published.response.status})`);
  }
  const actualArticles = new Set(published.body.articles);
  for (const article of expectedArticles) {
    if (!actualArticles.has(article)) {
      throw new Error(`Pages deployment is stale: missing ${article}`);
    }
  }
  // Health probes must distinguish "Worker is misconfigured" from
  // "the dynamic manifest source is temporarily unavailable".
  const health = await readJson(`${API}/health`);
  if (!health.response.ok || health.body?.status !== "configured") {
    throw new Error(`Worker /health is not configured: HTTP ${health.response.status}, code=${health.body?.error?.code ?? "unknown"}`);
  }
  const manifestStatus = await readJson(`${API}/health/manifest`);
  if (manifestStatus.response.status !== 200 && manifestStatus.response.status !== 503) {
    throw new Error(`Unexpected Worker manifest health status: HTTP ${manifestStatus.response.status}`);
  }
  if (manifestStatus.body?.remoteAvailable !== true) {
    process.stderr.write(
      "Warning: Worker remote manifest fetch is degraded. Verifying each article against the bundled fallback from this very build.\n"
    );
  }

  // A healthy read-only API on every newly published article is the actual
  // user-facing contract. A failed optional remote fetch must not turn a
  // working, synchronized bundled manifest into a false release failure.
  const visitorToken = "00000000-0000-4000-8000-000000000001";
  for (const article of expectedArticles) {
    const comments = await readJson(`${API}/v1/comments?articleId=${encodeURIComponent(article)}`);
    if (!comments.response.ok || !Array.isArray(comments.body?.comments)) {
      throw new Error(`Comments unavailable for ${article}: HTTP ${comments.response.status}, code=${comments.body?.error?.code ?? "unknown"}`);
    }
    const reaction = await readJson(
      `${API}/v1/reaction?articleId=${encodeURIComponent(article)}&visitorToken=${visitorToken}`
    );
    if (!reaction.response.ok || !Number.isInteger(reaction.body?.likes) ||
        typeof reaction.body?.liked !== "boolean") {
      throw new Error(`Likes unavailable for ${article}: HTTP ${reaction.response.status}, code=${reaction.body?.error?.code ?? "unknown"}`);
    }
  }
  process.stdout.write(
    `Verified public manifest, Worker /health, comments and likes for ${expectedArticles.size} published articles. Remote manifest fetch: ${manifestStatus.body?.remoteAvailable ? "ok" : "degraded (bundled fallback verified)"}.\n`
  );
}

let failure;
for (let attempt = 1; attempt <= 8; attempt++) {
  try {
    await verify();
    failure = null;
    break;
  } catch (error) {
    failure = error;
    process.stderr.write(`Engagement check ${attempt}/8: ${error.message}\n`);
    if (attempt < 8) await sleep(45_000);
  }
}
if (failure) throw failure;
