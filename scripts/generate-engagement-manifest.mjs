// Build a public allowlist from pages that Astro actually emitted. No draft
// source files, query strings, credentials, or private configuration are read.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative, sep } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "dist");
const siteOrigin = "https://bradcocox.github.io";
const siteBase = "/brad-log/";

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name === "index.html" ? [path] : [];
  }));
  return groups.flat();
}

const pages = [];
const articles = [];
for (const file of await htmlFiles(output)) {
  const localPath = relative(output, file).split(sep).join("/");
  const pagePath = new URL(siteBase + localPath.replace(/index\.html$/, ""), siteOrigin).pathname;
  const html = await readFile(file, "utf8");
  // A QA-only page must explicitly opt out; 404.html is excluded by the walk.
  if (/name=["']engagement-exclude["']/.test(html)) continue;
  pages.push(pagePath);
  if (/<meta\b(?=[^>]*\bproperty=["']og:type["'])(?=[^>]*\bcontent=["']article["'])[^>]*>/i.test(html)) {
    articles.push(pagePath);
  }
}
if (!pages.includes(siteBase) || pages.length > 1000) {
  throw new Error("Unexpected public page manifest; review the build before publishing.");
}
const manifest = JSON.stringify({ pages: [...new Set(pages)].sort(), articles: [...new Set(articles)].sort() }, null, 2) + "\n";
await writeFile(join(output, "engagement-pages.json"), manifest);
if (process.argv.includes("--update-fallback")) {
  await writeFile(join(root, "backend", "allowed-pages.json"), manifest);
}
process.stdout.write(`Public engagement manifest: ${pages.length} pages, ${articles.length} articles.\n`);
