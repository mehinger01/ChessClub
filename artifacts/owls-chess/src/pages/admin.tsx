import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Download, Upload, Trash2, Shield, Database, Palette, FileJson, AlertTriangle, RefreshCw, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../hooks/use-settings";
import { getProviders } from "../providers";
import { getAllThemes } from "../lib/themes";
import { getAllPieceSets } from "../lib/piece-sets";
import {
  PIECE_KEYS,
  type PieceKey,
  listCustomThemes,
  listCustomPieceSets,
  saveCustomTheme,
  deleteCustomTheme,
  validateCustomTheme,
  validateAndPreparePieceSet,
  saveCustomPieceSet,
  deleteCustomPieceSet,
  type CustomBoardTheme,
  type CustomPieceSet,
} from "../lib/custom-assets";
import { puzzles as bundledPuzzles } from "../data/puzzles";
import { clearImportedLibrary } from "../providers/local";
import type { AuditLogEntry, AppSettings } from "../providers/types";
import { formatDistanceToNow } from "date-fns";

export default function Admin() {
  const { settings, update } = useSettings();
  const providers = getProviders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const puzzleInputRef = useRef<HTMLInputElement>(null);
  const [audit, setAudit] = useState<AuditLogEntry[]>(() => providers.audit.list(100));
  const [puzzleLibSize, setPuzzleLibSize] = useState<number>(bundledPuzzles.length);
  const [customThemes, setCustomThemes] = useState<CustomBoardTheme[]>(() => listCustomThemes());
  const [customSets, setCustomSets] = useState<CustomPieceSet[]>(() => listCustomPieceSets());

  useEffect(() => {
    const refreshThemes = () => setCustomThemes(listCustomThemes());
    const refreshSets = () => setCustomSets(listCustomPieceSets());
    window.addEventListener("owls-themes", refreshThemes);
    window.addEventListener("owls-pieces", refreshSets);
    window.addEventListener("owls-storage", () => { refreshThemes(); refreshSets(); });
    return () => {
      window.removeEventListener("owls-themes", refreshThemes);
      window.removeEventListener("owls-pieces", refreshSets);
    };
  }, []);

  const allThemes = getAllThemes();
  const allPieceSets = getAllPieceSets();

  useEffect(() => {
    const refresh = () => setAudit(getProviders().audit.list(100));
    window.addEventListener("owls-audit", refresh);
    window.addEventListener("owls-storage", refresh);
    return () => {
      window.removeEventListener("owls-audit", refresh);
      window.removeEventListener("owls-storage", refresh);
    };
  }, []);

  useEffect(() => {
    getProviders().puzzleSource.loadLibrary().then(lib => setPuzzleLibSize(lib.length));
  }, [settings.puzzleSourceProviderId]);

  const handleExport = async () => {
    const data = await getProviders().storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `owls-chess-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    getProviders().audit.log({ actorUserId: "local-admin", actionType: "data.exported", targetType: "system" });
    toast.success("Backup downloaded");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      await getProviders().storage.importData(json);
      getProviders().audit.log({ actorUserId: "local-admin", actionType: "data.imported", targetType: "system", details: { filename: f.name } });
      toast.success("Backup restored. Reloading...");
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      toast.error("Import failed: " + (err as Error).message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePuzzleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      const result = await getProviders().puzzleSource.importLibrary(json);
      if (result.errors.length > 0) {
        toast.error(`Puzzle library rejected (${result.errors.length} issues). First: ${result.errors[0]}`);
      } else {
        getProviders().audit.log({ actorUserId: "local-admin", actionType: "puzzles.imported", targetType: "puzzleLibrary", details: { added: result.added, filename: f.name } });
        toast.success(`Imported ${result.added} puzzles`);
        const lib = await getProviders().puzzleSource.loadLibrary();
        setPuzzleLibSize(lib.length);
      }
    } catch (err) {
      toast.error("Puzzle import failed: " + (err as Error).message);
    } finally {
      if (puzzleInputRef.current) puzzleInputRef.current.value = "";
    }
  };

  const handleResetPuzzles = () => {
    clearImportedLibrary();
    getProviders().audit.log({ actorUserId: "local-admin", actionType: "puzzles.reset", targetType: "puzzleLibrary" });
    toast.success("Reverted to bundled puzzle library");
    getProviders().puzzleSource.loadLibrary().then(lib => setPuzzleLibSize(lib.length));
  };

  const handleClearAudit = () => {
    if (!confirm("Clear the entire audit log?")) return;
    getProviders().audit.clear();
    setAudit([]);
    toast.success("Audit log cleared");
  };

  const restricted = settings.deploymentMode === "restricted";

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 flex-1 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">Configuration, providers, themes, data, and audit log.</p>
      </div>

      {restricted && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Restricted mode active</AlertTitle>
          <AlertDescription>
            All providers are forced to local. External calls are disabled. Use this mode for school networks with strict policies.
          </AlertDescription>
        </Alert>
      )}

      {/* Deployment + providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif"><Shield className="w-5 h-5 text-primary" /> Deployment & Providers</CardTitle>
          <CardDescription>Choose how the app runs and where data lives. The provider layer means app code never depends on a specific backend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Deployment Mode</label>
              <Select value={settings.deploymentMode} onValueChange={(v: any) => update({ deploymentMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hosted">Hosted — external calls allowed</SelectItem>
                  <SelectItem value="school">School — local first, internal services only</SelectItem>
                  <SelectItem value="restricted">Restricted — no external calls at all</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">School ID (multi-tenant key)</label>
              <Input value={settings.schoolId} onChange={(e) => update({ schoolId: e.target.value })} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <ProviderRow label="Storage provider" value={settings.storageProviderId} options={[{ v: "local", l: "Local" }, { v: "hosted", l: "Hosted (Phase 6)", disabled: true }]} disabled={restricted} onChange={(v) => update({ storageProviderId: v })} />
            <ProviderRow label="Database provider" value={settings.databaseProviderId} options={[{ v: "local", l: "Local" }, { v: "hosted", l: "Hosted (Phase 6)", disabled: true }]} disabled={restricted} onChange={(v) => update({ databaseProviderId: v })} />
            <ProviderRow label="Auth provider" value={settings.authProviderId} options={[{ v: "local", l: "Local (no login)" }, { v: "hosted", l: "Hosted (Phase 6)", disabled: true }]} disabled={restricted} onChange={(v) => update({ authProviderId: v })} />
            <ProviderRow label="File provider" value={settings.fileProviderId} options={[{ v: "local", l: "Local" }, { v: "hosted", l: "Hosted (Phase 6)", disabled: true }]} disabled={restricted} onChange={(v) => update({ fileProviderId: v })} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/30">
            <div>
              <div className="text-sm font-medium">Allow external calls</div>
              <div className="text-xs text-muted-foreground">Disabled automatically in Restricted mode.</div>
            </div>
            <Switch checked={settings.allowExternalCalls} disabled={restricted} onCheckedChange={(checked) => update({ allowExternalCalls: checked })} />
          </div>
        </CardContent>
      </Card>

      {/* Themes + pieces */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif"><Palette className="w-5 h-5 text-primary" /> Appearance</CardTitle>
          <CardDescription>Pick the active board theme and piece set. Changes apply across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Board theme</label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allThemes.map(t => (
                <button
                  key={t.id}
                  onClick={() => update({ activeThemeId: t.id })}
                  className={`text-left rounded-xl border p-3 transition ${settings.activeThemeId === t.id ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <div className="grid grid-cols-4 gap-0.5 mb-2 rounded overflow-hidden">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-5" style={{ background: i % 2 === 0 ? t.lightSquare : t.darkSquare }} />
                    ))}
                  </div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Piece set</label>
            <div className="grid sm:grid-cols-2 gap-3">
              {allPieceSets.map(p => (
                <button
                  key={p.id}
                  onClick={() => update({ activePieceSetId: p.id })}
                  className={`text-left rounded-xl border p-3 transition ${settings.activePieceSetId === p.id ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.description}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom themes */}
      {settings.featureFlags.customThemes && (
        <CustomThemesCard
          items={customThemes}
          activeId={settings.activeThemeId}
          onActivate={(id) => update({ activeThemeId: id })}
          onDelete={(id) => {
            deleteCustomTheme(id);
            setCustomThemes(listCustomThemes());
            if (settings.activeThemeId === id) update({ activeThemeId: "royal" });
          }}
          onCreated={() => setCustomThemes(listCustomThemes())}
        />
      )}

      {/* Custom piece sets */}
      {settings.featureFlags.customPieceUploads && (
        <CustomPieceSetsCard
          items={customSets}
          activeId={settings.activePieceSetId}
          onActivate={(id) => update({ activePieceSetId: id })}
          onDelete={(id) => {
            deleteCustomPieceSet(id);
            setCustomSets(listCustomPieceSets());
            if (settings.activePieceSetId === id) update({ activePieceSetId: "classic" });
          }}
          onCreated={() => setCustomSets(listCustomPieceSets())}
        />
      )}

      {/* Feature flags */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Feature Flags</CardTitle>
          <CardDescription>Admin-controlled toggles. Some features require a future phase to be useful.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FlagRow label="Custom themes" hint="Lets admins define and activate school-branded board themes." value={settings.featureFlags.customThemes} onChange={(v) => update({ featureFlags: { ...settings.featureFlags, customThemes: v } })} />
          <FlagRow label="Custom piece uploads" hint="Lets admins upload a full 12-piece custom set (SVG/PNG)." value={settings.featureFlags.customPieceUploads} onChange={(v) => update({ featureFlags: { ...settings.featureFlags, customPieceUploads: v } })} />
          <FlagRow label="Leaderboard" hint="Show 'Top Solvers' on the home page." value={settings.featureFlags.leaderboardEnabled} onChange={(v) => update({ featureFlags: { ...settings.featureFlags, leaderboardEnabled: v } })} />
        </CardContent>
      </Card>

      {/* Class Focus */}
      <ClassFocusCard settings={settings} update={update} />

      {/* Data import / export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif"><Database className="w-5 h-5 text-primary" /> Data</CardTitle>
          <CardDescription>Backup and restore the entire app state, or swap puzzle libraries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export full backup (JSON)
            </Button>
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="w-4 h-4 mr-2" /> Import backup (JSON)
            </Button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
          </div>

          <div className="rounded-lg border border-border/50 p-3 bg-muted/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium flex items-center gap-2"><FileJson className="w-4 h-4" /> Puzzle library</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Active library has <span className="font-bold">{puzzleLibSize}</span> puzzles.
                  Source: <span className="font-mono">{settings.puzzleSourceProviderId}</span>.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => puzzleInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1" /> Import library
                </Button>
                <Button size="sm" variant="ghost" onClick={handleResetPuzzles}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Use bundled
                </Button>
                <input ref={puzzleInputRef} type="file" accept="application/json" onChange={handlePuzzleImport} className="hidden" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Library JSON must be an array of puzzle objects matching the bundled schema. Invalid libraries are rejected with details.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="font-serif">Audit Log</CardTitle>
            <CardDescription>Recent admin and system actions.</CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={handleClearAudit}>
            <Trash2 className="w-4 h-4 mr-1" /> Clear
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[320px]">
            {audit.length === 0 ? (
              <div className="text-sm text-muted-foreground p-6 text-center">No audit entries yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">When</th>
                    <th className="px-4 py-2 font-medium">Actor</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                    <th className="px-4 py-2 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map(e => (
                    <tr key={e.id} className="border-t border-border/40">
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(e.timestamp, { addSuffix: true })}</td>
                      <td className="px-4 py-2 text-xs font-mono">{e.actorUserId}</td>
                      <td className="px-4 py-2 text-xs font-mono">{e.actionType}</td>
                      <td className="px-4 py-2 text-xs">{e.targetType}{e.targetId ? <span className="text-muted-foreground"> · {e.targetId}</span> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderRow({ label, value, options, onChange, disabled }: { label: string; value: string; options: { v: string; l: string; disabled?: boolean }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.v} value={o.v} disabled={o.disabled}>{o.l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CustomThemesCard({ items, activeId, onActivate, onDelete, onCreated }: {
  items: CustomBoardTheme[]; activeId: string; onActivate: (id: string) => void; onDelete: (id: string) => void; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [colors, setColors] = useState({ lightSquare: "#f1f5f9", darkSquare: "#1a365d", borderColor: "#94a3b8", highlightColor: "#fde047", moveDotColor: "#1d4ed8" });
  const errors = validateCustomTheme({ name, ...colors });
  const canSave = errors.length === 0;

  const handleSave = () => {
    if (!canSave) { toast.error(errors[0]); return; }
    saveCustomTheme({ name, ...colors });
    setName("");
    onCreated();
    toast.success("Custom theme saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Custom Board Themes</CardTitle>
        <CardDescription>Define a school-branded board. Pick five colors, preview, then activate.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Theme name</label>
              <Input placeholder="e.g. Owls Royal" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {(["lightSquare", "darkSquare", "borderColor", "highlightColor", "moveDotColor"] as const).map(k => (
              <div key={k} className="flex items-center gap-3">
                <label className="text-sm font-medium w-32 capitalize">{k.replace(/([A-Z])/g, " $1")}</label>
                <input type="color" value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} className="w-10 h-8 rounded border border-border cursor-pointer" />
                <Input value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} className="font-mono text-xs" />
              </div>
            ))}
            <Button onClick={handleSave} disabled={!canSave}>Save theme</Button>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Preview</div>
            <div className="rounded-lg p-2 inline-block" style={{ background: colors.borderColor }}>
              <div className="grid grid-cols-4 gap-0">
                {Array.from({ length: 16 }).map((_, i) => {
                  const row = Math.floor(i / 4); const col = i % 4;
                  const dark = (row + col) % 2 === 1;
                  const highlight = i === 5;
                  return (
                    <div key={i} className="w-12 h-12 relative" style={{ background: dark ? colors.darkSquare : colors.lightSquare }}>
                      {highlight && <div className="absolute inset-0" style={{ background: colors.highlightColor, opacity: 0.5 }} />}
                      {i === 9 && <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{ background: colors.moveDotColor, opacity: 0.6 }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="border-t border-border/40 pt-3 space-y-2">
            <div className="text-sm font-medium">Saved custom themes</div>
            {items.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="grid grid-cols-2 w-10 h-10 rounded overflow-hidden">
                    <div style={{ background: t.lightSquare }} /><div style={{ background: t.darkSquare }} />
                    <div style={{ background: t.darkSquare }} /><div style={{ background: t.lightSquare }} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{activeId === t.id ? "Active" : "Saved"}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={activeId === t.id ? "default" : "outline"} onClick={() => onActivate(t.id)}>{activeId === t.id ? "Active" : "Activate"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete theme "${t.name}"?`)) onDelete(t.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomPieceSetsCard({ items, activeId, onActivate, onDelete, onCreated }: {
  items: CustomPieceSet[]; activeId: string; onActivate: (id: string) => void; onDelete: (id: string) => void; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [files, setFiles] = useState<Record<PieceKey, File | undefined>>({} as Record<PieceKey, File | undefined>);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const setFileFor = (k: PieceKey, f: File | undefined) => {
    const next = { ...files, [k]: f };
    setFiles(next);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreviewUrls(prev => ({ ...prev, [k]: url }));
    }
  };

  const allPresent = PIECE_KEYS.every(k => files[k]);

  const handleSave = async () => {
    setBusy(true);
    try {
      const result = await validateAndPreparePieceSet(name, files);
      if (!result.ok) {
        toast.error(`${result.errors.length} issue(s). First: ${result.errors[0]}`);
        return;
      }
      saveCustomPieceSet(name, result.files!);
      setName("");
      setFiles({} as Record<PieceKey, File | undefined>);
      setPreviewUrls({});
      onCreated();
      toast.success("Custom piece set saved");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Custom Piece Sets</CardTitle>
        <CardDescription>Upload all 12 pieces (SVG or PNG, max 256KB each). Files are validated before activation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Set name</label>
          <Input placeholder="e.g. Owls School Set" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PIECE_KEYS.map(k => (
            <label key={k} className="flex flex-col items-center gap-1 cursor-pointer rounded-lg border border-border/50 p-2 hover:border-primary/50 transition">
              <div className="w-12 h-12 flex items-center justify-center bg-muted/40 rounded">
                {previewUrls[k] ? <img src={previewUrls[k]} alt={k} className="w-10 h-10 object-contain" /> : <span className="text-xs font-mono text-muted-foreground">{k}</span>}
              </div>
              <span className="text-xs font-mono">{k}</span>
              <input type="file" accept="image/svg+xml,image/png" className="hidden" onChange={(e) => setFileFor(k, e.target.files?.[0])} />
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={!allPresent || !name || busy}>{busy ? "Validating..." : "Save piece set"}</Button>
          <span className="text-xs text-muted-foreground">{Object.values(files).filter(Boolean).length}/12 uploaded</span>
        </div>

        {items.length > 0 && (
          <div className="border-t border-border/40 pt-3 space-y-2">
            <div className="text-sm font-medium">Saved custom piece sets</div>
            {items.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {(["wK", "wQ", "bK", "bQ"] as PieceKey[]).map(k => (
                      <img key={k} src={s.files[k]} alt={k} className="w-6 h-6 object-contain bg-muted/40 rounded" />
                    ))}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{activeId === s.id ? "Active" : "Saved"}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={activeId === s.id ? "default" : "outline"} onClick={() => onActivate(s.id)}>{activeId === s.id ? "Active" : "Activate"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete piece set "${s.name}"?`)) onDelete(s.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FlagRow({ label, hint, value, onChange, disabled }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={value} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

const SKILL_CATEGORIES: { label: string; tags: string[] }[] = [
  {
    label: "Tactical Patterns",
    tags: ["forks", "pins", "skewers", "discovered_attacks", "double_checks", "deflections", "decoys", "interference", "clearance", "back_rank_threats", "checkmate_patterns"],
  },
  {
    label: "Calculation",
    tags: ["forcing_moves", "candidate_evaluation", "move_counting", "defensive_calculation"],
  },
  {
    label: "Vision",
    tags: ["board_vision", "coordinate_training", "piece_awareness", "threat_detection", "checks", "captures"],
  },
  {
    label: "Positional",
    tags: ["center_control", "piece_activity", "open_files", "weak_squares", "pawn_structure"],
  },
  {
    label: "Opening Principles",
    tags: ["center_occupation", "piece_development", "king_safety", "tempo"],
  },
  {
    label: "Endgame",
    tags: ["king_activation", "pawn_endgames", "rook_endgames", "opposition"],
  },
];

function ClassFocusCard({ settings, update }: { settings: AppSettings; update: (patch: Partial<AppSettings>) => void }) {
  const saved: string[] = settings.uiPreferences.classFocusTags ?? [];
  const [draft, setDraft] = useState<string[]>(saved);

  const toggle = (tag: string) =>
    setDraft(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const selectAll = (tags: string[]) =>
    setDraft(prev => [...new Set([...prev, ...tags])]);

  const clearCol = (tags: string[]) =>
    setDraft(prev => prev.filter(t => !tags.includes(t)));

  const isDirty =
    JSON.stringify([...draft].sort()) !== JSON.stringify([...saved].sort());

  const handleSave = () => {
    update({ uiPreferences: { ...settings.uiPreferences, classFocusTags: draft } });
    toast.success(
      draft.length === 0
        ? "Class focus cleared — all puzzles eligible"
        : `Class focus saved — ${draft.length} tag${draft.length !== 1 ? "s" : ""} active`
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif">
          <BookOpen className="w-5 h-5 text-primary" /> Class Focus
        </CardTitle>
        <CardDescription>
          Select the skill tags to emphasise this session. Puzzles matching these tags will be
          prioritised in the puzzle queue.{" "}
          {saved.length === 0
            ? "No filter active — all puzzles are eligible."
            : `${saved.length} tag${saved.length !== 1 ? "s" : ""} currently active.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {SKILL_CATEGORIES.map(({ label, tags }) => {
            const allSelected = tags.every(t => draft.includes(t));
            const noneSelected = tags.every(t => !draft.includes(t));
            return (
              <div
                key={label}
                className="rounded-xl border border-border/60 p-3 bg-muted/20 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-sm font-semibold text-foreground leading-tight">{label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => selectAll(tags)}
                      disabled={allSelected}
                      className="text-xs text-primary hover:underline disabled:opacity-30 disabled:no-underline leading-none"
                    >
                      All
                    </button>
                    <span className="text-xs text-muted-foreground leading-none">/</span>
                    <button
                      onClick={() => clearCol(tags)}
                      disabled={noneSelected}
                      className="text-xs text-primary hover:underline disabled:opacity-30 disabled:no-underline leading-none"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {tags.map(tag => (
                    <label key={tag} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={draft.includes(tag)}
                        onChange={() => toggle(tag)}
                        className="w-3.5 h-3.5 accent-primary cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                        {tag}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={!isDirty}>
            Save Class Focus
          </Button>
          {draft.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setDraft([])}
              className="text-muted-foreground"
            >
              Clear all
            </Button>
          )}
          <span className="text-sm text-muted-foreground ml-auto">
            {draft.length === 0
              ? "No filter — all puzzles eligible"
              : `${draft.length} tag${draft.length !== 1 ? "s" : ""} selected`}
            {isDirty && " · unsaved"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
