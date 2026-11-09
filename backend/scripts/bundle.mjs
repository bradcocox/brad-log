// No dependency or secret is required to make the dashboard-pasteable module.
import { readFile, mkdir, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("allowed-pages.json", root), "utf8"));
const source = await readFile(new URL("worker.mjs", root), "utf8");
const output = source.replace(
  'import manifest from "./allowed-pages.json" with { type: "json" };',
  `const manifest = ${JSON.stringify(manifest)};`
);
if (output === source) throw new Error("Manifest import was not bundled.");
await mkdir(new URL("dist/", root), { recursive: true });
await writeFile(new URL("dist/worker.mjs", root), output);
process.stdout.write("Prepared backend/dist/worker.mjs for the Cloudflare editor.\n");
