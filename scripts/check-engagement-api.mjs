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
  const manifestStatus = await readJson(`${API}/health/manifest`);
  if (!manifestStatus.response.ok || !manifestStatus.body?.remoteAvailable) {
    throw new Error(`Worker cannot read the public manifest (HTTP ${manifestStatus.response.status}); inspect Worker deploy and first-party fetch`);
  }
  for (const article of expectedArticles) {
    const { response, body } = await readJson(`${API}/v1/comments?articleId=${encodeURIComponent(article)}`);
    if (!response.ok || !Array.isArray(body?.comments)) {
      throw new Error(`Comments unavailable for ${article}: HTTP ${response.status}, code=${body?.error?.code ?? "unknown"}`);
    }
  }
  process.stdout.write(`Verified manifest, Worker health, and comments for ${expectedArticles.size} published articles.\n`);
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
