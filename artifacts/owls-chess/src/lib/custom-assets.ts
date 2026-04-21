// Custom assets — admin-uploaded piece sets and admin-defined board themes.
// Stored as JSON in localStorage. Pieces are inlined as data URLs (SVG/PNG).

import { auditService, loadSettings } from "../providers/local";

const CUSTOM_THEMES_KEY = "owls_custom_themes_v1";
const CUSTOM_PIECE_SETS_KEY = "owls_custom_piece_sets_v1";

export const PIECE_KEYS = ["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"] as const;
export type PieceKey = typeof PIECE_KEYS[number];
export const ALLOWED_PIECE_MIME = ["image/svg+xml", "image/png"];
export const MAX_PIECE_FILE_BYTES = 256 * 1024; // 256KB per piece

export interface CustomBoardTheme {
  id: string;
  schoolId: string;
  name: string;
  type: "custom";
  lightSquare: string;
  darkSquare: string;
  borderColor: string;
  highlightColor: string;
  moveDotColor: string;
  createdAt: number;
}

export interface CustomPieceSet {
  id: string;
  schoolId: string;
  name: string;
  type: "custom";
  files: Record<PieceKey, string>; // data URLs
  createdAt: number;
}

// ---- Themes ----

export function listCustomThemes(): CustomBoardTheme[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) ?? "[]"); } catch { return []; }
}

function writeCustomThemes(items: CustomBoardTheme[]) {
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("owls-themes"));
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export function isValidColor(c: string): boolean { return HEX.test(c); }

export function validateCustomTheme(t: Partial<CustomBoardTheme>): string[] {
  const errs: string[] = [];
  if (!t.name || t.name.trim().length < 2) errs.push("Name must be at least 2 characters");
  for (const f of ["lightSquare", "darkSquare", "borderColor", "highlightColor", "moveDotColor"] as const) {
    if (!t[f] || !isValidColor(t[f]!)) errs.push(`Invalid color for ${f}`);
  }
  return errs;
}

export function saveCustomTheme(input: Omit<CustomBoardTheme, "id" | "schoolId" | "type" | "createdAt">): CustomBoardTheme {
  const settings = loadSettings();
  const item: CustomBoardTheme = {
    ...input,
    id: `ct_${crypto.randomUUID()}`,
    schoolId: settings.schoolId,
    type: "custom",
    createdAt: Date.now(),
  };
  const list = listCustomThemes();
  list.push(item);
  writeCustomThemes(list);
  auditService.log({ actorUserId: "local-admin", actionType: "theme.created", targetType: "theme", targetId: item.id, details: { name: item.name } });
  return item;
}

export function deleteCustomTheme(id: string) {
  const next = listCustomThemes().filter(t => t.id !== id);
  writeCustomThemes(next);
  auditService.log({ actorUserId: "local-admin", actionType: "theme.deleted", targetType: "theme", targetId: id });
}

// ---- Piece sets ----

export function listCustomPieceSets(): CustomPieceSet[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_PIECE_SETS_KEY) ?? "[]"); } catch { return []; }
}

function writeCustomPieceSets(items: CustomPieceSet[]) {
  localStorage.setItem(CUSTOM_PIECE_SETS_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("owls-pieces"));
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Failed to read " + file.name));
    r.readAsDataURL(file);
  });
}

function imageLoads(dataUrl: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

export interface PieceUploadValidation {
  ok: boolean;
  errors: string[];
  files?: Record<PieceKey, string>;
}

export async function validateAndPreparePieceSet(name: string, fileMap: Record<PieceKey, File | undefined>): Promise<PieceUploadValidation> {
  const errors: string[] = [];
  if (!name || name.trim().length < 2) errors.push("Name must be at least 2 characters");
  const out: Partial<Record<PieceKey, string>> = {};
  for (const k of PIECE_KEYS) {
    const f = fileMap[k];
    if (!f) { errors.push(`Missing file for ${k}`); continue; }
    if (!ALLOWED_PIECE_MIME.includes(f.type)) { errors.push(`${k}: must be SVG or PNG`); continue; }
    if (f.size > MAX_PIECE_FILE_BYTES) { errors.push(`${k}: file too large (max 256KB)`); continue; }
    try {
      const url = await fileToDataUrl(f);
      const ok = await imageLoads(url);
      if (!ok) { errors.push(`${k}: image failed to load`); continue; }
      out[k] = url;
    } catch (e) {
      errors.push(`${k}: ${(e as Error).message}`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], files: out as Record<PieceKey, string> };
}

export function saveCustomPieceSet(name: string, files: Record<PieceKey, string>): CustomPieceSet {
  const settings = loadSettings();
  const item: CustomPieceSet = {
    id: `cp_${crypto.randomUUID()}`,
    schoolId: settings.schoolId,
    name,
    type: "custom",
    files,
    createdAt: Date.now(),
  };
  const list = listCustomPieceSets();
  list.push(item);
  writeCustomPieceSets(list);
  auditService.log({ actorUserId: "local-admin", actionType: "pieceSet.created", targetType: "pieceSet", targetId: item.id, details: { name } });
  return item;
}

export function deleteCustomPieceSet(id: string) {
  const next = listCustomPieceSets().filter(p => p.id !== id);
  writeCustomPieceSets(next);
  auditService.log({ actorUserId: "local-admin", actionType: "pieceSet.deleted", targetType: "pieceSet", targetId: id });
}
