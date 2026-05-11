/**
 * ScholarForge Chess — settings store.
 *
 * Reactive Zustand mirror over the existing provider settings. All writes flow
 * through providers.updateSettings() so the audit log and existing useSettings
 * consumers stay in sync. Custom piece blobs and custom board image live in
 * IndexedDB via idb-keyval — only their reference keys are kept in AppSettings.
 *
 * customPieceUrls holds in-memory object: URLs derived from IDB blobs. Call
 * hydrateCustomPieceUrls() on app boot (or settings page mount) to restore them.
 * saveCustomPieceBlob() keeps the map up-to-date immediately on upload.
 */

import { create } from "zustand";
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from "idb-keyval";
import { loadSettings, updateSettings } from "../providers";
import type { AppSettings, UIPreferences, PieceKey } from "../providers/types";
import { PIECE_KEYS } from "../lib/custom-assets";

const PIECE_BLOB_PREFIX = "piece-blob:";
const BOARD_IMAGE_PREFIX = "board-image:";

interface SettingsState {
  settings: AppSettings;
  ui: UIPreferences;

  /**
   * In-memory object: URLs for every custom piece that has been uploaded to IDB.
   * Created from blobs via URL.createObjectURL. Persisted source is IndexedDB;
   * this map is repopulated by hydrateCustomPieceUrls().
   */
  customPieceUrls: Partial<Record<PieceKey, string>>;

  refreshFromStorage: () => void;
  updateUI: (patch: Partial<UIPreferences>) => void;

  /**
   * Load every piece blob from IDB, revoke stale object: URLs, and populate
   * customPieceUrls. Call this once on settings-page mount (and after import).
   */
  hydrateCustomPieceUrls: () => Promise<void>;

  // Custom piece blob management (IndexedDB)
  saveCustomPieceBlob: (key: PieceKey, blob: Blob) => Promise<void>;
  loadCustomPieceBlob: (key: PieceKey) => Promise<Blob | null>;
  deleteCustomPieceBlob: (key: PieceKey) => Promise<void>;
  listCustomPieceBlobKeys: () => Promise<PieceKey[]>;

  // Custom board image (IndexedDB)
  saveCustomBoardImage: (blob: Blob) => Promise<string>;
  loadCustomBoardImage: (key: string) => Promise<Blob | null>;
  deleteCustomBoardImage: (key: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = loadSettings();

  if (typeof window !== "undefined") {
    const handler = () => get().refreshFromStorage();
    window.addEventListener("owls-settings", handler);
    window.addEventListener("storage", handler);
  }

  return {
    settings: initial,
    ui: initial.uiPreferences,
    customPieceUrls: {},

    refreshFromStorage: () => {
      const next = loadSettings();
      set({ settings: next, ui: next.uiPreferences });
    },

    updateUI: (patch) => {
      const next = updateSettings({ uiPreferences: { ...get().ui, ...patch } });
      set({ settings: next, ui: next.uiPreferences });
    },

    hydrateCustomPieceUrls: async () => {
      // Revoke stale object: URLs first to avoid memory leaks
      const prev = get().customPieceUrls;
      for (const url of Object.values(prev)) {
        if (url) URL.revokeObjectURL(url);
      }
      const urls: Partial<Record<PieceKey, string>> = {};
      for (const key of PIECE_KEYS) {
        const blob = await idbGet<Blob>(`${PIECE_BLOB_PREFIX}${key}`);
        if (blob instanceof Blob) {
          urls[key] = URL.createObjectURL(blob);
        }
      }
      set({ customPieceUrls: urls });
    },

    saveCustomPieceBlob: async (key, blob) => {
      await idbSet(`${PIECE_BLOB_PREFIX}${key}`, blob);
      // Track which keys have uploads in settings so the store survives page-refresh
      const cur = get().ui.customPieceKeys;
      if (!cur.includes(key)) {
        get().updateUI({ customPieceKeys: [...cur, key] });
      }
      // Immediately update in-memory object: URL so the board re-renders without
      // requiring a full hydrateCustomPieceUrls() round-trip
      const prevUrl = get().customPieceUrls[key];
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      const url = URL.createObjectURL(blob);
      set({ customPieceUrls: { ...get().customPieceUrls, [key]: url } });
    },

    loadCustomPieceBlob: async (key) => {
      const v = await idbGet<Blob>(`${PIECE_BLOB_PREFIX}${key}`);
      return v instanceof Blob ? v : null;
    },

    deleteCustomPieceBlob: async (key) => {
      await idbDel(`${PIECE_BLOB_PREFIX}${key}`);
      const cur = get().ui.customPieceKeys.filter(k => k !== key);
      get().updateUI({ customPieceKeys: cur });
      // Revoke and remove object: URL
      const prevUrl = get().customPieceUrls[key];
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      const next = { ...get().customPieceUrls };
      delete next[key];
      set({ customPieceUrls: next });
    },

    listCustomPieceBlobKeys: async () => {
      const all = await idbKeys();
      return all
        .filter((k): k is string => typeof k === "string" && k.startsWith(PIECE_BLOB_PREFIX))
        .map(k => k.slice(PIECE_BLOB_PREFIX.length) as PieceKey);
    },

    saveCustomBoardImage: async (blob) => {
      const key = `${BOARD_IMAGE_PREFIX}${Date.now()}`;
      await idbSet(key, blob);
      get().updateUI({ customBoardImageKey: key });
      return key;
    },

    loadCustomBoardImage: async (key) => {
      const v = await idbGet<Blob>(key);
      return v instanceof Blob ? v : null;
    },

    deleteCustomBoardImage: async (key) => {
      await idbDel(key);
      if (get().ui.customBoardImageKey === key) {
        get().updateUI({ customBoardImageKey: null });
      }
    },
  };
});
