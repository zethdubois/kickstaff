import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseDotEnvFile } from "./kickagentEnvParse";

function testParseDotEnvFile(): void {
  const dir = mkdtempSync(join(tmpdir(), "ka-env-"));
  const path = join(dir, ".env");
  writeFileSync(
    path,
    [
      "# comment",
      "KICKAGENT_DB_DEFAULT=dev",
      "DATABASE_URL_DEV=postgresql://localhost/dev",
      "DATABASE_URL=postgresql://prod/example # trailing comment",
    ].join("\n"),
    "utf8",
  );

  const parsed = parseDotEnvFile(path);
  assert.equal(parsed.KICKAGENT_DB_DEFAULT, "dev");
  assert.equal(parsed.DATABASE_URL_DEV, "postgresql://localhost/dev");
  assert.equal(parsed.DATABASE_URL, "postgresql://prod/example");
}

testParseDotEnvFile();
console.log("✓ kickagentEnv.test passed");
