// Read-only production contract: freshly published HTML -> trusted manifest -> Worker.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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
  // Both datasets must be exactly equal: not only "all expected posts exist".
  const canonical = value => JSON.stringify({
    pages: [...value.pages].sort(),
    articles: [...value.articles].sort(),
  });
  if (!Array.isArray(published.body.pages) || canonical(expected) !== canonical(published.body)) {
    throw new Error("Published Pages manifest does not EXACTLY match this build.");
  }
  // Health probes must distinguish "Worker is misconfigured" from
  // "the dynamic manifest source is temporarily unavailable".
  const health = await readJson(`${API}/health`);
  if (!health.response.ok || health.body?.status !== "configured") {
    throw new Error(`Worker /health is not configured: HTTP ${health.response.status}, code=${health.body?.error?.code ?? "unknown"}`);
  }
  const manifestStatus = await readJson(`${API}/health/manifest`);
  const digest = createHash("sha256").update(canonical(expected)).digest("hex");
  if (!manifestStatus.response.ok ||
      manifestStatus.body?.status !== "ok" ||
      manifestStatus.body?.source !== "deploy-bundle" ||
      manifestStatus.body?.sha256 !== digest ||
      manifestStatus.body?.articles !== expected.articles.length ||
      manifestStatus.body?.pages !== expected.pages.length) {
    throw new Error(
      `Worker manifest does not match the published Pages build: HTTP ${manifestStatus.response.status}, ` +
      `source=${manifestStatus.body?.source ?? "none"}, ` +
      `hashMatch=${manifestStatus.body?.sha256 === digest}. Deployment cannot pass while unsynced.`
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
    `Verified public manifest, Worker /health, comments and likes for ${expectedArticles.size} published articles. Worker bundle SHA256 is an exact match.\n`
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
