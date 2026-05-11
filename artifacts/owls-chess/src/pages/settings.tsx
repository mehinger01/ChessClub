/**
 * ScholarForge Chess — Settings page.
 *
 * Personalization for the player: pick a board theme, pick a piece set, tune
 * interface toggles, and deeply customize board appearance. The live preview
 * mirrors what /play will render, including watermarks and coordinates.
 *
 * Board appearance (square colors, highlights, watermark, coordinates) is
 * controlled by UIPreferences. No full-board background images are used.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Settings as SettingsIcon, Check, Upload, Trash2 } from "lucide-react";
import { Chessboard } from "react-chessboard";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { Separator } from "../components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useSettings } from "../hooks/use-settings";
import { useSettingsStore } from "../stores/settingsStore";
import { getAllThemes, getTheme } from "../lib/themes";
import { getAllPieceSets, getPieceSet } from "../lib/piece-sets";
import { PIECE_KEYS, ALLOWED_PIECE_MIME, MAX_PIECE_FILE_BYTES, type PieceKey } from "../lib/custom-assets";
import type { UIPreferences } from "../providers/types";
import { getProviders } from "../providers";
import { BoardCoords } from "../components/game/BoardCoords";
import { BoardAppearanceCard } from "../components/settings/BoardAppearanceCard";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const PIECE_LABELS: Record<PieceKey, string> = {
  wK: "White King", wQ: "White Queen", wR: "White Rook",
  wB: "White Bishop", wN: "White Knight", wP: "White Pawn",
  bK: "Black King", bQ: "Black Queen", bR: "Black Rook",
  bB: "Black Bishop", bN: "Black Knight", bP: "Black Pawn",
};

export default function Settings() {
  const { settings, update } = useSettings();
  const settingsStore = useSettingsStore();
  const customPieceUrls = useSettingsStore(s => s.customPieceUrls);

  const themes = getAllThemes();
  const pieceSets = getAllPieceSets();
  const activeTheme = getTheme(settings.activeThemeId);
  const activePieceSet = getPieceSet(settings.activePieceSetId);
  const ui = settings.uiPreferences;

  // ─── Live preview colours (UIPreferences override > theme default) ─────────
  const previewDark        = ui.boardDark  || activeTheme.darkSquare;
  const previewLight       = ui.boardLight || activeTheme.lightSquare;
  const previewBorderColor = ui.borderColor || "";
  const coordsOutside      = ui.showCoordinates && (ui.coordinatePosition ?? "inside") === "outside";
  const coordFontSize      = ui.coordinateFontSize ?? 11;

  // Watermark for preview
  const [previewWatermarkFailed, setPreviewWatermarkFailed] = useState(false);
  useEffect(() => { setPreviewWatermarkFailed(false); }, [activeTheme.watermarkImage]);

  // Hydrate custom piece URLs from IndexedDB on mount
  useEffect(() => {
    settingsStore.hydrateCustomPieceUrls();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewPieces = useMemo(
    () => activePieceSet.customPieces?.(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePieceSet.id, customPieceUrls],
  );

  const setTheme = (id: string) => {
    update({ activeThemeId: id });
    getProviders().audit.log({ actorUserId: "local-admin", actionType: "settings.theme.changed", targetType: "settings", details: { themeId: id } });
  };
  const setPieceSet = (id: string) => {
    update({ activePieceSetId: id });
    getProviders().audit.log({ actorUserId: "local-admin", actionType: "settings.pieceSet.changed", targetType: "settings", details: { pieceSetId: id } });
  };
  const setUI = (patch: Partial<UIPreferences>) => {
    update({ uiPreferences: { ...ui, ...patch } });
  };

  const uploadedCount = Object.keys(customPieceUrls).length;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 text-primary">
            <SettingsIcon className="w-6 h-6" />
            <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
          </div>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Personalize the board, pieces, and interface for your classroom.
            Changes save automatically and stay on this device.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/play" data-testid="settings-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to play
          </Link>
        </Button>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
        {/* ─── Left column ─── */}
        <div className="space-y-6">
          {/* Board theme */}
          <Card data-testid="settings-section-themes">
            <CardHeader>
              <CardTitle className="font-serif">Board theme</CardTitle>
              <CardDescription>Pick the base colors for the squares. Fine-tune colors below in Board appearance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {themes.map(t => {
                  const isActive = t.id === settings.activeThemeId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`group relative rounded-lg border p-2 text-left transition hover-elevate active-elevate-2 ${isActive ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                      data-testid={`theme-option-${t.id}`}
                      aria-pressed={isActive}
                    >
                      {/* Mini-board swatch */}
                      <div className="grid grid-cols-4 grid-rows-4 w-full aspect-square rounded overflow-hidden mb-2 relative">
                        {Array.from({ length: 16 }).map((_, i) => {
                          const row = Math.floor(i / 4); const col = i % 4;
                          const dark = (row + col) % 2 === 1;
                          return (
                            <div
                              key={i}
                              style={{ background: dark ? t.darkSquare : t.lightSquare }}
                            />
                          );
                        })}
                        {/* Watermark preview for themes with a watermarkImage */}
                        {t.watermarkImage && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <img
                              src={t.watermarkImage}
                              alt=""
                              aria-hidden="true"
                              style={{ width: "50%", height: "50%", objectFit: "contain", opacity: 0.25 }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{t.name}</span>
                        {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Board appearance */}
          <BoardAppearanceCard
            ui={ui}
            theme={activeTheme}
            onUpdate={settingsStore.updateUI}
          />

          {/* Piece set */}
          <Card data-testid="settings-section-pieces">
            <CardHeader>
              <CardTitle className="font-serif">Piece set</CardTitle>
              <CardDescription>Choose the look of the pieces. Upload your own below.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pieceSets.map(p => {
                  const isActive = p.id === settings.activePieceSetId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPieceSet(p.id)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition hover-elevate active-elevate-2 ${isActive ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                      data-testid={`piece-set-option-${p.id}`}
                      aria-pressed={isActive}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{p.name}</span>
                          {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                          {p.id === "custom" && uploadedCount > 0 && (
                            <span className="text-xs text-muted-foreground">({uploadedCount}/12)</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Custom piece uploads */}
          <CustomPiecesCard
            customPieceUrls={customPieceUrls}
            onSave={async (key, file) => {
              await settingsStore.saveCustomPieceBlob(key, file);
              toast.success(`${PIECE_LABELS[key]} saved`);
              if (settings.activePieceSetId !== "custom") setPieceSet("custom");
            }}
            onDelete={async (key) => {
              await settingsStore.deleteCustomPieceBlob(key);
              toast.success(`${PIECE_LABELS[key]} removed`);
            }}
            isCustomSetActive={settings.activePieceSetId === "custom"}
            onActivate={() => setPieceSet("custom")}
          />

          {/* Interface */}
          <Card data-testid="settings-section-interface">
            <CardHeader>
              <CardTitle className="font-serif">Interface</CardTitle>
              <CardDescription>Hints, sound, and theme mode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ToggleRow id="showLegalMoves" label="Show legal moves" description="Highlight valid destinations when you select a piece." checked={ui.showLegalMoves} onCheckedChange={v => setUI({ showLegalMoves: v })} />
              <Separator />
              <ToggleRow id="autoQueen" label="Auto-promote to queen" description="Skip the promotion picker and always queen pawns reaching the back rank." checked={ui.autoQueen} onCheckedChange={v => setUI({ autoQueen: v })} />
              <Separator />
              <ToggleRow id="autoFlip" label="Auto-flip for Black" description="Show the board from Black's perspective when the active student plays Black." checked={ui.autoFlip} onCheckedChange={v => setUI({ autoFlip: v })} />
              <Separator />
              <ToggleRow id="soundEnabled" label="Sound effects" description="Move and capture sounds (synthesized — no asset files required)." checked={ui.soundEnabled} onCheckedChange={v => setUI({ soundEnabled: v })} />
              {ui.soundEnabled && (
                <div className="space-y-2 pl-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="soundVolume" className="text-sm">Volume</Label>
                    <span className="text-xs text-muted-foreground tabular-nums" data-testid="sound-volume-value">
                      {Math.round(ui.soundVolume * 100)}%
                    </span>
                  </div>
                  <Slider id="soundVolume" min={0} max={1} step={0.05} value={[ui.soundVolume]} onValueChange={(v: number[]) => setUI({ soundVolume: v[0] ?? 0 })} data-testid="slider-sound-volume" />
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="darkMode" className="text-sm font-medium">Theme mode</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Light, dark, or follow your operating system.</p>
                </div>
                <Select value={ui.darkMode} onValueChange={(v: string) => setUI({ darkMode: v as UIPreferences["darkMode"] })}>
                  <SelectTrigger id="darkMode" className="w-36" data-testid="select-dark-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Learning */}
          <Card data-testid="settings-section-learning">
            <CardHeader>
              <CardTitle className="font-serif">Learning</CardTitle>
              <CardDescription>Assistance features for beginners and developing players.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ToggleRow
                id="noviceMode"
                label="Novice Mode"
                description="Show piece names on hover, how each piece moves when selected, and highlight enemy pieces threatening the selected piece."
                checked={ui.noviceMode ?? false}
                onCheckedChange={v => setUI({ noviceMode: v })}
              />
              <Separator />
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-muted-foreground">Coach Mode</Label>
                    <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border/60 uppercase tracking-wide">
                      Coming soon
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Coach Mode will eventually give hints, explain mistakes, and suggest practice positions.
                  </p>
                </div>
                <Switch disabled checked={false} aria-label="Coach Mode (coming soon)" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Right column: live preview ─── */}
        <div className="lg:sticky lg:top-6 space-y-3">
          <Card data-testid="settings-preview">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-lg">Live preview</CardTitle>
              <CardDescription>What the board will look like when you play.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Outer wrapper — extra padding when coordinates are outside */}
              <div
                style={{
                  position: "relative",
                  maxWidth: 280,
                  margin: "0 auto",
                  paddingLeft: coordsOutside ? `${coordFontSize * 2}px` : undefined,
                  paddingBottom: coordsOutside ? `${coordFontSize * 2}px` : undefined,
                }}
              >
                {/* Board inner wrapper */}
                <div
                  className="aspect-square w-full rounded-sm"
                  style={{
                    position: "relative",
                    overflow: coordsOutside ? "visible" : "hidden",
                    border: previewBorderColor ? `2px solid ${previewBorderColor}` : undefined,
                  }}
                >
                  <Chessboard
                    id="SettingsPreviewBoard"
                    position={STARTING_FEN}
                    arePiecesDraggable={false}
                    boardOrientation="white"
                    customDarkSquareStyle={{ backgroundColor: previewDark }}
                    customLightSquareStyle={{ backgroundColor: previewLight }}
                    customPieces={previewPieces}
                    showBoardNotation={false}
                    animationDuration={0}
                  />
                  {/* Watermark overlay */}
                  {activeTheme.watermarkImage && !previewWatermarkFailed && (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{ zIndex: 2 }}
                    >
                      <img
                        src={activeTheme.watermarkImage}
                        alt=""
                        aria-hidden="true"
                        onError={() => setPreviewWatermarkFailed(true)}
                        style={{
                          width: "25%",
                          height: "25%",
                          objectFit: "contain",
                          opacity: ui.watermarkOpacity ?? 0.30,
                          userSelect: "none",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  )}
                  {/* Coordinate overlay */}
                  <BoardCoords
                    orientation="white"
                    position={ui.coordinatePosition ?? "inside"}
                    color={ui.coordinateColor || "#94a3b8"}
                    opacity={ui.coordinateOpacity ?? 0.9}
                    fontSize={ui.coordinateFontSize ?? 11}
                    show={ui.showCoordinates}
                  />
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground text-center">
                <div>Theme: <span className="font-medium text-foreground">{activeTheme.name}</span></div>
                <div>Pieces: <span className="font-medium text-foreground">{activePieceSet.name}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Pieces Card ────────────────────────────────────────────────────────

interface CustomPiecesCardProps {
  customPieceUrls: Partial<Record<PieceKey, string>>;
  onSave: (key: PieceKey, file: File) => Promise<void>;
  onDelete: (key: PieceKey) => Promise<void>;
  isCustomSetActive: boolean;
  onActivate: () => void;
}

function CustomPiecesCard({ customPieceUrls, onSave, onDelete, isCustomSetActive, onActivate }: CustomPiecesCardProps) {
  const fileInputRefs = useRef<Partial<Record<PieceKey, HTMLInputElement>>>({});
  const uploadedCount = Object.keys(customPieceUrls).length;

  const handleFile = async (key: PieceKey, file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_PIECE_MIME.includes(file.type)) { toast.error(`${key}: must be an SVG or PNG file`); return; }
    if (file.size > MAX_PIECE_FILE_BYTES) { toast.error(`${key}: file too large (max 256 KB)`); return; }
    await onSave(key, file);
    const el = fileInputRefs.current[key];
    if (el) el.value = "";
  };

  return (
    <Card data-testid="settings-section-custom-pieces">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-serif">Custom piece images</CardTitle>
            <CardDescription>Upload your own SVG or PNG for any of the 12 piece slots (max 256 KB each). Pieces persist across page reloads. Select the "Custom" set above to use them.</CardDescription>
          </div>
          {uploadedCount > 0 && !isCustomSetActive && (
            <Button size="sm" variant="outline" onClick={onActivate} data-testid="custom-pieces-activate" className="shrink-0">
              <Check className="w-4 h-4 mr-1" /> Activate
            </Button>
          )}
          {isCustomSetActive && uploadedCount > 0 && (
            <span className="text-xs text-primary font-medium shrink-0 mt-1">Active</span>
          )}
        </div>
        {uploadedCount > 0 && <p className="text-xs text-muted-foreground mt-1">{uploadedCount} of 12 slots filled</p>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {PIECE_KEYS.map(key => {
            const url = customPieceUrls[key];
            return (
              <div key={key} className="flex flex-col items-center gap-1" data-testid={`custom-piece-slot-${key}`}>
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[key]?.click()}
                  className="relative w-full aspect-square rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center hover:border-primary/60 hover:bg-primary/5 transition group"
                  title={url ? `Replace ${PIECE_LABELS[key]}` : `Upload ${PIECE_LABELS[key]}`}
                  data-testid={`custom-piece-upload-${key}`}
                >
                  {url ? (
                    <>
                      <img src={url} alt={key} className="w-4/5 h-4/5 object-contain" />
                      <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <Upload className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition" />
                  )}
                </button>
                <div className="flex items-center gap-1 w-full justify-center">
                  <span className="text-xs font-mono text-muted-foreground">{key}</span>
                  {url && (
                    <button type="button" onClick={() => onDelete(key)} className="text-muted-foreground/50 hover:text-destructive transition" title={`Remove ${PIECE_LABELS[key]}`} data-testid={`custom-piece-delete-${key}`}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <input
                  ref={el => { if (el) fileInputRefs.current[key] = el; }}
                  type="file"
                  accept="image/svg+xml,image/png"
                  className="hidden"
                  onChange={e => handleFile(key, e.target.files?.[0])}
                  data-testid={`custom-piece-input-${key}`}
                />
              </div>
            );
          })}
        </div>
        {uploadedCount === 0 && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Click any slot to upload a piece image. Files are saved to this browser's storage.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── ToggleRow ─────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

function ToggleRow({ id, label, description, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} data-testid={`switch-${id}`} />
    </div>
  );
}
