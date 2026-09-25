import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const contract = JSON.parse(await readFile(new URL("../shared-notes-contract.json", import.meta.url), "utf8"));

test("Automations consumes the shared Logseq notes contract", () => {
  assert.equal(contract.package, "@orin/notes");
  assert.equal(contract.version, "1.0.0");
  assert.equal(contract.format, "logseq-markdown");
  assert.deepEqual(contract.preserves, ["page properties", "tags", "nested blocks", "stable block ids"]);
});
