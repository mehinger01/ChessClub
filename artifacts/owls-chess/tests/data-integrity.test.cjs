const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

class MemoryStorage {
  values = new Map();
  failKey = null;
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) {
    if (key === this.failKey) { this.failKey = null; throw new Error("quota exceeded"); }
    this.values.set(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
global.localStorage = new MemoryStorage();
global.window = new EventTarget();
const { storage } = require("../src/lib/storage.ts");
const { exportBackup, importBackup } = require("../src/lib/backup.ts");
const { DEFAULT_SETTINGS, localPuzzleSourceProvider } = require("../src/providers/local.ts");
const { puzzles } = require("../src/data/puzzles.ts");
const { useGameStore } = require("../src/stores/gameStore.ts");
const { useStudentStore } = require("../src/stores/studentStore.ts");
const { gameArchive } = require("../src/lib/gameArchive.ts");
const json = (key, value) => localStorage.setItem(key, JSON.stringify(value));
let assets;
beforeEach(() => {
  localStorage.clear();
  assets = { values: [], async read() { return this.values; }, async replace(values) { this.values = values; } };
  useGameStore.getState().resetToNewBoard();
  useStudentStore.getState().refreshFromStorage();
});
const exportData = () => exportBackup(DEFAULT_SETTINGS, assets);
const restore = payload => importBackup(payload, DEFAULT_SETTINGS, assets);
function finishGame(student, color = "w") {
  const state = useGameStore.getState();
  state.startGame({ whitePlayer: "Alpha", blackPlayer: "Beta", studentId: student.id, studentColor: color });
  state.tryMove("e2", "e4");
  state.resign("b");
  return useGameStore.getState().buildGameRecord();
}

test("version 3 round-trip restores histories, null selection, preferences and binary assets into an empty browser", async () => {
  const student = storage.addStudent("Alpha", "A");
  storage.recordPuzzleAttempt(student.id, puzzles[0], { correct: true, hintsUsed: 1 });
  const record = finishGame(student);
  storage.saveGameRecord(record);
  storage.recordGameResult(student.id, "win", record.id);
  gameArchive.save(useGameStore.getState().completedGame);
  json("owls_puzzle_library_v1", puzzles);
  json("owls_custom_themes_v1", [{ id: "theme", name: "Custom", lightSquare: "#fff", darkSquare: "#000", borderColor: "#aaa", highlightColor: "#bbb", moveDotColor: "#ccc" }]);
  json("owls_custom_piece_sets_v1", [{ id: "set", name: "Custom", files: { wK: "data:image/png;base64,AA==" } }]);
  json("owls_files_v1", { sample: "image/png;AA==" });
  localStorage.setItem("scholarforge_brand_profile_v1", "owls");
  json("owls_data_lesson", { value: 42 });
  assets.values = [["piece-blob:wK", new Blob([new Uint8Array([0, 255, 128])], { type: "image/png" })]];
  const backup = await exportData();
  localStorage.clear(); assets.values = [];
  localStorage.setItem("owls_active_student", "stale");
  await restore(JSON.parse(JSON.stringify(backup)));
  assert.equal(storage.getActiveStudentId(), null);
  assert.equal(storage.listGameRecords(student.id)[0].id, record.id);
  assert.equal(gameArchive.list()[0].gameId, record.id);
  assert.equal(storage.getStudents()[0].wins, 1);
  assert.equal(storage.getAttempts().length, 1);
  assert.equal(localStorage.getItem("scholarforge_brand_profile_v1"), "owls");
  assert.deepEqual(JSON.parse(localStorage.getItem("owls_data_lesson")), { value: 42 });
  assert.deepEqual([...new Uint8Array(await assets.values[0][1].arrayBuffer())], [0, 255, 128]);
  const second = await exportData();
  delete backup.exportedAt; delete second.exportedAt;
  assert.deepEqual(second, backup);
});

test("malformed content and unsupported or incomplete envelopes make no writes", async () => {
  const student = storage.addStudent("Original", "O");
  const valid = await exportData();
  const before = [...localStorage.values];
  for (const patch of [
    { puzzleLibrary: [{ ...puzzles[0], fen: "bad" }] },
    { students: [{}] }, { attempts: [{ correct: "yes" }] },
    { gameRecords: { wrong: [{ ...finishGame(student), studentId: "other" }] } },
    { settings: { uiPreferences: { showLegalMoves: "yes" } } },
    { binaryAssets: [{ key: "unrelated", type: "image/png", data: "AA==" }] },
    { version: 99 },
  ]) {
    await assert.rejects(restore({ ...valid, ...patch }));
    assert.deepEqual([...localStorage.values], before);
  }
  await assert.rejects(restore({ version: 3, students: [] }));
  await assert.rejects(restore({}));
});

test("v1/v2 backups preserve absent histories/assets and merge nested preferences", async () => {
  const student = storage.addStudent("Original", "O");
  const record = finishGame(student); storage.saveGameRecord(record);
  assets.values = [["piece-blob:bK", new Blob(["keep"])]];
  for (const version of [undefined, 1, 2]) {
    await restore({ ...(version ? { version } : {}), students: storage.getStudents(), settings: { uiPreferences: { darkMode: "dark" } } });
    assert.equal(storage.listGameRecords(student.id).length, 1);
    assert.equal(assets.values.length, 1);
    const settings = JSON.parse(localStorage.getItem("owls_settings_v1"));
    assert.equal(settings.uiPreferences.darkMode, "dark");
    assert.equal(settings.uiPreferences.showCoordinates, true);
  }
  json("owls_puzzle_library_v1", puzzles);
  await restore({ version: 2, puzzleLibrary: null });
  assert.equal(localStorage.getItem("owls_puzzle_library_v1"), null);
});

test("quota failure rolls back local records and binary assets without publishing restore events", async () => {
  storage.addStudent("Old", "O");
  const old = await exportData();
  storage.addStudent("New", "N");
  const before = [...localStorage.values];
  assets.values = [["piece-blob:wK", new Blob(["old asset"])]];
  localStorage.failKey = "owls_attempts_v2";
  let events = 0; const listener = () => events++;
  window.addEventListener("owls-storage", listener);
  await assert.rejects(restore(old), /quota/);
  window.removeEventListener("owls-storage", listener);
  assert.deepEqual([...localStorage.values], before);
  assert.equal(await assets.values[0][1].text(), "old asset");
  assert.equal(events, 0);
});

test("binary storage failures prevent local writes; unreadable stored histories cannot be silently exported", async () => {
  storage.addStudent("Old", "O");
  const backup = await exportData(); const before = [...localStorage.values];
  const replace = assets.replace; assets.replace = async () => { throw new Error("asset transaction failed"); };
  await assert.rejects(restore(backup), /asset transaction/);
  assert.deepEqual([...localStorage.values], before);
  assets.replace = replace;
  json("owls_students_v2", {});
  await assert.rejects(exportData());
});

test("stable game ID and upserts prevent replay/remount duplicates and support correction after undo", () => {
  const student = storage.addStudent("Alpha", "A");
  const record = finishGame(student);
  const id = record.id;
  assert.equal(useGameStore.getState().completedGame.gameId, id);
  assert.equal(useGameStore.getState().buildGameRecord().id, id);
  storage.saveGameRecord(record); storage.saveGameRecord(record);
  assert.equal(storage.listGameRecords(student.id).length, 1);
  assert.equal(storage.recordGameResult(student.id, "win", id), true);
  assert.equal(storage.recordGameResult(student.id, "win", id), false);
  assert.equal(storage.getStudents()[0].gamesPlayed, 1);
  useGameStore.getState().undo();
  useGameStore.getState().tryMove("d2", "d4");
  useGameStore.getState().declareDraw();
  const updated = useGameStore.getState().buildGameRecord();
  assert.equal(updated.id, id);
  storage.saveGameRecord(updated);
  storage.recordGameResult(student.id, "draw", id);
  const saved = storage.getStudents()[0];
  assert.equal(saved.gamesPlayed, 1); assert.equal(saved.wins, 0); assert.equal(saved.draws, 1);
  assert.equal(storage.listGameRecords(student.id)[0].result, "1/2-1/2");
  useGameStore.getState().startGame({ whitePlayer: "A", blackPlayer: "B" });
  assert.notEqual(useGameStore.getState().gameId, id);
});

test("result recording stays bound to the original student when header selection changes", () => {
  const a = storage.addStudent("Alpha", "A"); const b = storage.addStudent("Beta", "B");
  const record = finishGame(a, "b");
  useStudentStore.getState().setActiveStudent(b.id);
  useStudentStore.getState().recordGameResult("loss", record.id, a.id);
  assert.equal(storage.getStudents().find(s => s.id === a.id).losses, 1);
  assert.equal(storage.getStudents().find(s => s.id === b.id).gamesPlayed, 0);
  assert.equal(useGameStore.getState().studentColor, "b");
});

test("puzzle imports reject illegal solutions, wrong turns and duplicates while accepting bundled puzzles", () => {
  assert.equal(localPuzzleSourceProvider.validateLibrary(puzzles).ok, true);
  for (const library of [[puzzles[0], puzzles[0]], [{ ...puzzles[0], solution: ["e4"] }], [{ ...puzzles[0], sideToMove: "black" }]]) {
    assert.equal(localPuzzleSourceProvider.validateLibrary(library).ok, false);
  }
});
