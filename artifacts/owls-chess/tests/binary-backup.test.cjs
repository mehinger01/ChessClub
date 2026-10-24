require("fake-indexeddb/auto");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createStore, set, get } = require("idb-keyval");
const { browserAssets } = require("../src/lib/backup.ts");

test("binary restore replaces chess blobs in one real IndexedDB transaction and preserves unrelated keys", async () => {
  const store = createStore("keyval-store", "keyval");
  await set("piece-blob:wK", new Blob(["old"]), store);
  await set("board-image:old", new Blob(["old board"]), store);
  await set("unrelated", "keep", store);
  await browserAssets.replace([["piece-blob:bK", new Blob(["new"], { type: "image/png" })]]);
  assert.equal(await get("piece-blob:wK", store), undefined);
  assert.equal(await get("board-image:old", store), undefined);
  assert.equal(await get("unrelated", store), "keep");
  const read = await browserAssets.read();
  assert.equal(read.length, 1);
  assert.equal(read[0][0], "piece-blob:bK");
  assert.equal(await read[0][1].text(), "new");
});
