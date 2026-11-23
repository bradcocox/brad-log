// Produce an ephemeral Wrangler config for the EXISTING production Worker.
// This never prints IDs, tokens, or runtime secrets.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const id = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim();
if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
  throw new Error("CLOUDFLARE_D1_DATABASE_ID must be configured as a GitHub Actions secret.");
}
const config = JSON.parse(await readFile(new URL("wrangler.jsonc", root), "utf8"));
if (config.name !== "brad-log-community" ||
    config.d1_databases?.length !== 1 ||
    config.d1_databases[0].binding !== "DB") {
  throw new Error("Unexpected production Worker/D1 target; refusing to deploy.");
}
config.main = "worker.mjs";
config.d1_databases[0].database_id = id;
// Keep the current Dashboard FEATURES_ENABLED value, including a deliberate kill switch.
// Existing SIGNING_SECRET and TURNSTILE_SECRET remain encrypted in Cloudflare.
delete config.vars;
config.keep_vars = true;
config.secrets = { required: ["SIGNING_SECRET", "TURNSTILE_SECRET"] };
delete config.$schema;
await mkdir(new URL("dist/", root), { recursive: true });
await writeFile(new URL("dist/wrangler.json", root), JSON.stringify(config, null, 2) + "\n");
process.stdout.write("Prepared production config; existing runtime variables and secrets retained.\n");
