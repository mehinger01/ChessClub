import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Download, Upload, Trash2, Shield, Database, Palette, FileJson, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../hooks/use-settings";
import { getProviders } from "../providers";
import { BOARD_THEMES } from "../lib/themes";
import { PIECE_SETS } from "../lib/piece-sets";
import { puzzles as bundledPuzzles } from "../data/puzzles";
import { clearImportedLibrary } from "../providers/local";
import type { AuditLogEntry } from "../providers/types";
import { formatDistanceToNow } from "date-fns";

export default function Admin() {
  const { settings, update } = useSettings();
  const providers = getProviders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const puzzleInputRef = useRef<HTMLInputElement>(null);
  const [audit, setAudit] = useState<AuditLogEntry[]>(() => providers.audit.list(100));
  const [puzzleLibSize, setPuzzleLibSize] = useState<number>(bundledPuzzles.length);

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
              {BOARD_THEMES.map(t => (
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
              {PIECE_SETS.map(p => (
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
            {!settings.featureFlags.customPieceUploads && (
              <p className="text-xs text-muted-foreground mt-2">Custom piece uploads are reserved for Phase 7 (productization).</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature flags */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Feature Flags</CardTitle>
          <CardDescription>Admin-controlled toggles. Some features require a future phase to be useful.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FlagRow label="Custom themes" hint="Enables future custom theme uploads (Phase 7)." value={settings.featureFlags.customThemes} disabled onChange={(v) => update({ featureFlags: { ...settings.featureFlags, customThemes: v } })} />
          <FlagRow label="Custom piece uploads" hint="Enables admin-uploaded piece sets (Phase 7)." value={settings.featureFlags.customPieceUploads} disabled onChange={(v) => update({ featureFlags: { ...settings.featureFlags, customPieceUploads: v } })} />
          <FlagRow label="Leaderboard" hint="Show 'Top Solvers' on the home page." value={settings.featureFlags.leaderboardEnabled} onChange={(v) => update({ featureFlags: { ...settings.featureFlags, leaderboardEnabled: v } })} />
        </CardContent>
      </Card>

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
