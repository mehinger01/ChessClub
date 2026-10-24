import { z } from "zod";
import { createStore, entries, promisifyRequest } from "idb-keyval";
import type { AppSettings } from "../providers/types";
import { storage } from "./storage";
import { validatePuzzleLibrary } from "./puzzleValidation";

const count = z.number().finite().nonnegative();
const student = z
  .object({
    id: z.string().min(1),
    firstName: z.string(),
    lastInitial: z.string(),
    displayName: z.string(),
    puzzlesAttempted: count,
    puzzlesCorrect: count,
    puzzlesIncorrect: count,
    puzzleScore: count,
    gamesPlayed: count,
    wins: count,
    losses: count,
    draws: count,
    lessonsCompleted: z.array(z.string()),
    currentLevel: count,
    usedPuzzleIds: z.array(z.string()),
    lastActive: count,
    recordedGameResults: z.record(z.enum(["win", "loss", "draw"])).optional(),
    skillProfile: z
      .record(
        z.object({
          attempts: count,
          solved: count,
          rating: count,
          lastSeen: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();
const attempt = z
  .object({
    id: z.string(),
    puzzleId: z.string(),
    studentId: z.string(),
    correct: z.boolean(),
    hintsUsed: count,
    score: count,
    theme: z.string(),
    difficulty: count,
    timestamp: count,
  })
  .passthrough();
const game = z
  .object({
    id: z.string().min(1),
    studentId: z.string().min(1),
    pgn: z.string(),
    white: z.string(),
    black: z.string(),
    result: z.enum(["1-0", "0-1", "1/2-1/2", "*"]),
    date: z.string(),
    moveCount: count,
    duration: count,
    timesPerMove: z.array(count),
    openingViolations: z.array(
      z
        .object({
          moveIndex: count,
          violation: z.string(),
          explanation: z.string(),
        })
        .passthrough(),
    ),
    annotations: z.record(z.unknown()),
  })
  .passthrough();
const archivedGame = z
  .object({
    gameId: z.string().min(1),
    timestamp: count,
    result: z.enum(["1-0", "0-1", "1/2-1/2", "*"]),
    pgn: z.string(),
    moveCount: count,
    whitePlayerId: z.string(),
    blackPlayerId: z.string(),
  })
  .passthrough();
const puzzle = z
  .object({
    id: z.string(),
    title: z.string(),
    theme: z.string(),
    difficulty: z.number().int().min(1).max(5),
    sideToMove: z.enum(["white", "black"]),
    fen: z.string(),
    solution: z.array(z.string()),
    hints: z.tuple([z.string(), z.string(), z.string()]),
    explanation: z.string(),
    feedbackCorrect: z.string(),
    feedbackIncorrect: z.string(),
  })
  .passthrough();
const jsonObject = z.record(z.unknown());
const assetKey = z
  .string()
  .regex(/^(piece-blob:(w|b)[PKQRBN]|board-image:[\w-]+)$/);
const binaryAsset = z.object({
  key: assetKey,
  type: z.string(),
  data: z
    .string()
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
});

const schema = z
  .object({
    version: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    students: z.array(student).optional(),
    attempts: z.array(attempt).optional(),
    settings: jsonObject.optional(),
    audit: z
      .array(
        z
          .object({
            id: z.string(),
            schoolId: z.string(),
            actorUserId: z.string(),
            actionType: z.string(),
            targetType: z.string(),
            timestamp: count,
          })
          .passthrough(),
      )
      .optional(),
    activeStudentId: z.string().nullable().optional(),
    puzzleLibrary: z.array(puzzle).nullable().optional(),
    gameRecords: z.record(z.array(game)).optional(),
    gameArchive: z.array(archivedGame).optional(),
    customThemes: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            lightSquare: z.string(),
            darkSquare: z.string(),
            borderColor: z.string(),
            highlightColor: z.string(),
            moveDotColor: z.string(),
          })
          .passthrough(),
      )
      .optional(),
    customPieceSets: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            files: z.record(z.string()),
          })
          .passthrough(),
      )
      .optional(),
    files: z.record(z.string()).optional(),
    brandProfile: z.enum(["falcons", "owls"]).nullable().optional(),
    structuredData: z.record(z.unknown()).optional(),
    binaryAssets: z.array(binaryAsset).optional(),
  })
  .strict();

type Backup = z.infer<typeof schema>;
const fields = {
  students: "owls_students_v2",
  attempts: "owls_attempts_v2",
  settings: "owls_settings_v1",
  audit: "owls_audit_v1",
  activeStudentId: "owls_active_student",
  puzzleLibrary: "owls_puzzle_library_v1",
  gameRecords: "owls_game_records_v1",
  gameArchive: "owls_archive_v1",
  customThemes: "owls_custom_themes_v1",
  customPieceSets: "owls_custom_piece_sets_v1",
  files: "owls_files_v1",
  brandProfile: "scholarforge_brand_profile_v1",
} as const;

export interface AssetStorage {
  read(): Promise<[string, Blob][]>;
  replace(values: [string, Blob][]): Promise<void>;
}
const isAssetKey = (key: unknown): key is string =>
  typeof key === "string" && assetKey.safeParse(key).success;
// Same database/store as idb-keyval's default used by settingsStore.
const useAssets = createStore("keyval-store", "keyval");
export const browserAssets: AssetStorage = {
  async read() {
    if (typeof indexedDB === "undefined")
      throw new Error(
        "Custom asset storage is unavailable; backup/restore was not completed.",
      );
    const all = await entries(useAssets);
    return all.filter(
      (entry): entry is [string, Blob] =>
        isAssetKey(entry[0]) && entry[1] instanceof Blob,
    );
  },
  async replace(values) {
    await useAssets("readwrite", (store) => {
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (isAssetKey(cursor.key)) cursor.delete();
          cursor.continue();
        } else {
          for (const [key, blob] of values) store.put(blob, key);
        }
      };
      return promisifyRequest(store.transaction);
    });
  },
};

function readJson(key: string, fallback: unknown) {
  const value = localStorage.getItem(key);
  if (value === null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Cannot back up unreadable data: ${key}`);
  }
}

function normalizeSettings(
  input: Record<string, unknown>,
  defaults: AppSettings,
): AppSettings {
  // Validate supplied fields against defaults before merging nested preferences.
  function validate(value: unknown, template: unknown, path: string): void {
    if (template === null) {
      if (value !== null && typeof value !== "string")
        throw new Error(`Invalid ${path}`);
      return;
    }
    if (Array.isArray(template)) {
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string"))
        throw new Error(`Invalid ${path}`);
      return;
    }
    if (typeof template === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error(`Invalid ${path}`);
      for (const [key, v] of Object.entries(value)) {
        if (key in template)
          validate(
            v,
            (template as Record<string, unknown>)[key],
            `${path}.${key}`,
          );
      }
      return;
    }
    if (
      typeof value !== typeof template ||
      (typeof value === "number" && !Number.isFinite(value))
    )
      throw new Error(`Invalid ${path}`);
  }
  validate(input, defaults, "settings");
  const merged = {
    ...defaults,
    ...input,
    featureFlags: {
      ...defaults.featureFlags,
      ...(input.featureFlags as object),
    },
    uiPreferences: {
      ...defaults.uiPreferences,
      ...(input.uiPreferences as object),
    },
  } as AppSettings;
  if (
    !["hosted", "school", "restricted"].includes(merged.deploymentMode) ||
    !["light", "dark", "system"].includes(merged.uiPreferences.darkMode)
  )
    throw new Error("Invalid settings mode");
  if (merged.deploymentMode === "restricted") {
    merged.allowExternalCalls = false;
    merged.storageProviderId =
      merged.databaseProviderId =
      merged.authProviderId =
      merged.fileProviderId =
      merged.puzzleSourceProviderId =
        "local";
  }
  return merged;
}

function parseBackup(payload: unknown, defaults: AppSettings): Backup {
  // exportedAt was informational in v1/v2 and remains informational in v3.
  const envelope = z
    .object({ exportedAt: z.string().optional() })
    .passthrough()
    .parse(payload);
  const { exportedAt: _, ...data } = envelope;
  const backup = schema.parse(data);
  if (!Object.keys(fields).some((key) => key in backup))
    throw new Error("This file contains no ChessClub backup data.");
  if (backup.version === 3) {
    for (const field of [
      ...Object.keys(fields),
      "structuredData",
      "binaryAssets",
    ]) {
      if (!(field in backup))
        throw new Error(`Incomplete version 3 backup: missing ${field}`);
    }
  }
  if (backup.settings)
    backup.settings = normalizeSettings(
      backup.settings,
      defaults,
    ) as unknown as Record<string, unknown>;
  if (backup.puzzleLibrary) {
    const errors = validatePuzzleLibrary(backup.puzzleLibrary);
    if (errors.length) throw new Error(`Invalid puzzle library: ${errors[0]}`);
  }
  if (backup.gameRecords) {
    for (const [id, records] of Object.entries(backup.gameRecords)) {
      if (records.some((record) => record.studentId !== id))
        throw new Error("Game history student ID mismatch");
    }
  }
  if (
    backup.binaryAssets &&
    new Set(backup.binaryAssets.map((a) => a.key)).size !==
      backup.binaryAssets.length
  )
    throw new Error("Duplicate asset keys");
  return backup;
}

function dataKeys(): string[] {
  return Array.from(
    { length: localStorage.length },
    (_, i) => localStorage.key(i)!,
  ).filter((key) => key.startsWith("owls_data_"));
}
function encode(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}

export async function exportBackup(
  defaults: AppSettings,
  assets: AssetStorage = browserAssets,
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {
    version: 3,
    students: readJson(fields.students, storage.getStudents()),
    attempts: readJson(fields.attempts, storage.getAttempts()),
    settings: readJson(fields.settings, defaults),
    audit: readJson(fields.audit, []),
    activeStudentId: localStorage.getItem(fields.activeStudentId),
    puzzleLibrary: readJson(fields.puzzleLibrary, null),
    gameRecords: readJson(fields.gameRecords, {}),
    gameArchive: readJson(fields.gameArchive, []),
    customThemes: readJson(fields.customThemes, []),
    customPieceSets: readJson(fields.customPieceSets, []),
    files: readJson(fields.files, {}),
    brandProfile: localStorage.getItem(fields.brandProfile),
    structuredData: Object.fromEntries(
      dataKeys().map((key) => [key.slice(10), readJson(key, null)]),
    ),
    binaryAssets: await Promise.all(
      (await assets.read()).map(async ([key, blob]) => ({
        key,
        type: blob.type,
        data: encode(new Uint8Array(await blob.arrayBuffer())),
      })),
    ),
  };
  // Do not export a plausible-looking backup that has silently lost corrupt records.
  readJson(fields.students, []);
  readJson(fields.attempts, []);
  parseBackup(data, defaults);
  return { ...data, exportedAt: new Date().toISOString() };
}

let restoring = false;
export async function importBackup(
  payload: unknown,
  defaults: AppSettings,
  assets: AssetStorage = browserAssets,
): Promise<void> {
  if (restoring) throw new Error("A restore is already in progress.");
  restoring = true;
  try {
    const backup = parseBackup(payload, defaults); // Everything validated before writes.
    const writes = new Map<string, string | null>();
    for (const [field, key] of Object.entries(fields)) {
      const value = backup[field as keyof Backup];
      if (value === undefined) continue; // Older backups leave unrepresented data intact.
      writes.set(
        key,
        value === null
          ? null
          : field === "activeStudentId" || field === "brandProfile"
            ? (value as string)
            : JSON.stringify(value),
      );
    }
    if (backup.structuredData) {
      for (const key of dataKeys()) writes.set(key, null);
      for (const [key, value] of Object.entries(backup.structuredData))
        writes.set(`owls_data_${key}`, JSON.stringify(value));
    }
    const previous = new Map(
      [...writes.keys()].map((key) => [key, localStorage.getItem(key)]),
    );
    const nextAssets: [string, Blob][] | undefined = backup.binaryAssets?.map(
      (asset) => [
        asset.key,
        new Blob([Uint8Array.from(atob(asset.data), (c) => c.charCodeAt(0))], {
          type: asset.type,
        }),
      ],
    );
    const previousAssets = nextAssets ? await assets.read() : undefined;
    let assetsWritten = false;
    try {
      if (nextAssets) {
        await assets.replace(nextAssets);
        assetsWritten = true;
      }
      for (const [key, value] of writes) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
    } catch (error) {
      try {
        for (const [key, value] of previous) {
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        }
        if (assetsWritten && previousAssets)
          await assets.replace(previousAssets);
      } catch {
        throw new Error(
          "Restore failed and rollback could not finish. Keep this browser open and retain your backup.",
        );
      }
      throw error;
    }
    for (const event of [
      "owls-storage",
      "owls-settings",
      "owls-puzzles",
      "owls-themes",
      "owls-pieces",
      "scholarforge-brand",
    ])
      window.dispatchEvent(new Event(event));
  } finally {
    restoring = false;
  }
}
