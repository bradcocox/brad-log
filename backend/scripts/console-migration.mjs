// Prepare this initial schema for the D1 Console textbox, which may strip
// pasted newlines. This is deliberately not a general-purpose SQL minifier.
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("migrations/0001_community.sql", root), "utf8");
const lines = source.split(/\r?\n/).filter(line => !/^\s*--/.test(line));
for (const line of lines) {
  if (line.includes("--") || /\/\*|\*\//.test(line) ||
      (line.match(/'/g)?.length ?? 0) % 2 ||
      (line.match(/"/g)?.length ?? 0) % 2) {
    throw new Error("This schema contains an unsupported comment or multiline literal; review it before preparing Console SQL.");
  }
}
const output = lines.map(line => line.trim()).filter(Boolean).join(" ") + "\n";

function snapshot(sql) {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(sql);
    db.exec(sql); // Re-pasting the initial migration must remain safe.
    assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    return {
      objects: db.prepare(`
        SELECT type, name, tbl_name, sql FROM sqlite_master
        WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name
      `).all().map(row => ({ ...row, sql: row.sql.replace(/\s+/g, " ").trim() })),
      initialCounters: db.prepare("SELECT id, visits FROM site_counters ORDER BY id").all(),
    };
  } finally {
    db.close();
  }
}

const expected = snapshot(source);
assert.deepEqual(snapshot(output), expected, "Console SQL differs from the original migration.");
await mkdir(new URL("dist/", root), { recursive: true });
await writeFile(new URL("dist/0001_community.console.sql", root), output);
const counts = Object.fromEntries(["table", "index", "trigger"].map(type =>
  [type, expected.objects.filter(object => object.type === type).length]
));
process.stdout.write(
  `Prepared backend/dist/0001_community.console.sql (${Buffer.byteLength(output)} bytes, one SQL line).\n` +
  `SQLite comparison passed: ${counts.table} tables, ${counts.index} indexes, ${counts.trigger} triggers; initial counters match.\n`
);
