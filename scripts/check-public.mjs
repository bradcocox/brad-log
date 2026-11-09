// Publication guard: reports locations only, never the credential match.
// This does not replace manual review, image inspection, or a full secret scanner.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const mode = process.argv[2];
if (!["--source", "--dist"].includes(mode)) {
  console.error("Usage: node scripts/check-public.mjs --source|--dist");
  process.exit(2);
}
const root = process.cwd();
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : entry.isFile() ? [relative(root, path)] : [];
  });
}
const files = mode === "--source"
  ? [...new Set(execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\0").filter(Boolean))]
  : walk(join(root, "dist"));
const rules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ["GitHub credential", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
  ["cloud access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["Slack credential", /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g],
  ["API credential", /\bsk-(?:proj-|ant-api[0-9]{2}-)?[A-Za-z0-9_-]{30,}\b/g],
  ["credential in URL", /https?:\/\/[^\s/:"'<>]+:[^\s/@"'<>]+@/g],
  ["secret assignment", /(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']([A-Za-z0-9+_/=.-]{20,})["']/gi],
];
const forbiddenName = /(?:^|\/)(?:\.env(?:\..+)?|credentials[^/]*\.json|service-account[^/]*\.json|[^/]+\.(?:pem|key|p12|pfx))$/i;
const findings = [];
let scanned = 0;
for (const file of files) {
  if (!existsSync(file) || !statSync(file).isFile()) continue;
  if (forbiddenName.test(file) && !file.endsWith(".env.example")) findings.push(`${file}: forbidden credential filename`);
  const buffer = readFileSync(file);
  if (buffer.includes(0)) continue;
  const content = buffer.toString("utf8");
  scanned++;
  for (const [name, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const line = content.slice(0, match.index).split("\n").length;
      findings.push(`${file}:${line}: possible ${name}`);
    }
  }
}
if (findings.length) {
  console.error("Publication blocked. Review these locations locally; do not paste secret values into logs or issues:");
  console.error(findings.join("\n"));
  process.exit(1);
}
console.log(`Public-content guard: ${scanned} text files checked (${mode.slice(2)}); no supported credential patterns found.`);
