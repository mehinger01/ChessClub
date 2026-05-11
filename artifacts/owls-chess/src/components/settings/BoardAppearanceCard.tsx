/**
 * BoardAppearanceCard — advanced board customization panel.
 *
 * Exposes full control over square colors, border, highlight colors, watermark
 * opacity (for themes that have a watermarkImage), and coordinate appearance.
 * Every change auto-saves to localStorage via updateUI().
 *
 * Three action buttons:
 *  - Reset to Royal Owl  — restores the built-in Royal Owl defaults
 *  - Reset to Default    — clears all overrides (reverts to active theme values)
 *  - Save (confirmation) — shows a toast confirming the current settings are saved
 */
import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import type { UIPreferences } from "../../providers/types";
import type { BoardTheme } from "../../lib/themes";

// ─── Color helpers ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h.padEnd(6, "0");
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}

/** Parse any CSS color (hex / rgba / rgb) → { hex, alpha }. Fallback: yellow 0.4. */
function splitColor(css: string): { hex: string; alpha: number } {
  const rgba = css.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/);
  if (rgba) {
    const [r, g, b] = [parseInt(rgba[1]), parseInt(rgba[2]), parseInt(rgba[3])];
    const a = rgba[4] !== undefined ? parseFloat(rgba[4]) : 1;
    return { hex: rgbToHex(r, g, b), alpha: a };
  }
  if (/^#[0-9a-f]{3,8}$/i.test(css)) {
    return { hex: css.slice(0, 7).padEnd(7, "0"), alpha: 1 };
  }
  return { hex: "#ffeb64", alpha: 0.4 };
}

function joinColor(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface SquareColorFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onReset: () => void;
  testId?: string;
}

function SquareColorField({ label, value, placeholder, onChange, onReset, testId }: SquareColorFieldProps) {
  const displayHex = value || placeholder;
  const safehex = /^#[0-9a-f]{6}$/i.test(displayHex) ? displayHex : "#888888";
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-6 h-6 rounded border border-border/60 shrink-0"
        style={{ background: displayHex }}
      />
      <div className="flex-1 min-w-0">
        <Label className="text-xs text-muted-foreground">{label}</Label>
      </div>
      <input
        type="color"
        value={safehex}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-7 cursor-pointer rounded border border-border/60 p-0 bg-transparent"
        data-testid={testId}
        aria-label={label}
      />
      {value && (
        <button
          type="button"
          onClick={onReset}
          className="text-muted-foreground/60 hover:text-muted-foreground text-xs"
          title="Reset to theme default"
          aria-label={`Reset ${label}`}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface HighlightColorFieldProps {
  label: string;
  value: string;
  defaultColor: string;
  defaultAlpha: number;
  onChange: (v: string) => void;
  onReset: () => void;
  testId?: string;
}

function HighlightColorField({ label, value, defaultColor, defaultAlpha, onChange, onReset, testId }: HighlightColorFieldProps) {
  const { hex: currentHex, alpha: currentAlpha } = value
    ? splitColor(value)
    : { hex: defaultColor, alpha: defaultAlpha };
  const safehex = /^#[0-9a-f]{6}$/i.test(currentHex) ? currentHex : defaultColor;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div
          className="w-6 h-6 rounded border border-border/60 shrink-0"
          style={{ background: joinColor(safehex, currentAlpha) }}
        />
        <div className="flex-1 min-w-0">
          <Label className="text-xs text-muted-foreground">{label}</Label>
        </div>
        <input
          type="color"
          value={safehex}
          onChange={e => onChange(joinColor(e.target.value, currentAlpha))}
          className="w-8 h-7 cursor-pointer rounded border border-border/60 p-0 bg-transparent"
          data-testid={testId}
          aria-label={label}
        />
        {value && (
          <button
            type="button"
            onClick={onReset}
            className="text-muted-foreground/60 hover:text-muted-foreground"
            title="Reset to default"
            aria-label={`Reset ${label}`}
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 pl-9">
        <Label className="text-xs text-muted-foreground w-12">Opacity</Label>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[currentAlpha]}
          onValueChange={([v = defaultAlpha]) => onChange(joinColor(safehex, v))}
          className="flex-1"
          aria-label={`${label} opacity`}
        />
        <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
          {Math.round(currentAlpha * 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── Royal Owl preset values ────────────────────────────────────────────────────

const ROYAL_OWL_PRESET: Partial<UIPreferences> = {
  boardLight: "#f1f5f9",
  boardDark: "#1a365d",
  borderColor: "",
  highlightMove: "rgba(255,235,100,0.40)",
  highlightSelect: "rgba(255,235,100,0.55)",
  highlightCheck: "rgba(239,68,68,0.45)",
  dotLegal: "rgba(0,0,0,0.18)",
  threatHighlight: "rgba(255,100,50,0.40)",
  coordinateColor: "#94a3b8",
  coordinateOpacity: 0.9,
  coordinateFontSize: 11,
  coordinatePosition: "inside",
};

// ─── Empty (use-theme-defaults) preset ─────────────────────────────────────────

const CLEAR_PRESET: Partial<UIPreferences> = {
  boardLight: "",
  boardDark: "",
  borderColor: "",
  highlightMove: "",
  highlightSelect: "",
  highlightCheck: "",
  dotLegal: "",
  threatHighlight: "",
  coordinateColor: "",
  coordinateOpacity: 0.9,
  coordinateFontSize: 11,
  coordinatePosition: "inside",
};

// ─── Main component ─────────────────────────────────────────────────────────────

interface BoardAppearanceCardProps {
  ui: UIPreferences;
  theme: BoardTheme;
  onUpdate: (patch: Partial<UIPreferences>) => void;
}

export function BoardAppearanceCard({ ui, theme, onUpdate }: BoardAppearanceCardProps) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    toast.success("Board appearance saved.");
    setTimeout(() => setSaved(false), 2000);
  };

  const resetToRoyalOwl = () => {
    onUpdate(ROYAL_OWL_PRESET);
    toast.success("Board reset to Royal Owl defaults.");
  };

  const resetToDefault = () => {
    onUpdate(CLEAR_PRESET);
    toast.success("Board reset to theme defaults.");
  };

  const hasWatermark = !!theme.watermarkImage;

  return (
    <Card data-testid="settings-section-board-appearance">
      <CardHeader>
        <CardTitle className="font-serif">Board appearance</CardTitle>
        <CardDescription>
          Customize square colors, highlights, coordinates, and the watermark. All changes save automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── Square colors ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Square colors</h3>
          <SquareColorField
            label="Light squares"
            value={ui.boardLight}
            placeholder={theme.lightSquare}
            onChange={v => onUpdate({ boardLight: v })}
            onReset={() => onUpdate({ boardLight: "" })}
            testId="color-board-light"
          />
          <SquareColorField
            label="Dark squares"
            value={ui.boardDark}
            placeholder={theme.darkSquare}
            onChange={v => onUpdate({ boardDark: v })}
            onReset={() => onUpdate({ boardDark: "" })}
            testId="color-board-dark"
          />
          <SquareColorField
            label="Board border"
            value={ui.borderColor}
            placeholder="#00000000"
            onChange={v => onUpdate({ borderColor: v })}
            onReset={() => onUpdate({ borderColor: "" })}
            testId="color-border"
          />
        </div>

        <Separator />

        {/* ── Highlight colors ── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Highlight colors</h3>
          <HighlightColorField
            label="Last move"
            value={ui.highlightMove}
            defaultColor="#ffeb64"
            defaultAlpha={0.4}
            onChange={v => onUpdate({ highlightMove: v })}
            onReset={() => onUpdate({ highlightMove: "" })}
            testId="color-highlight-move"
          />
          <HighlightColorField
            label="Selected square"
            value={ui.highlightSelect}
            defaultColor="#ffeb64"
            defaultAlpha={0.55}
            onChange={v => onUpdate({ highlightSelect: v })}
            onReset={() => onUpdate({ highlightSelect: "" })}
            testId="color-highlight-select"
          />
          <HighlightColorField
            label="Legal move dot"
            value={ui.dotLegal}
            defaultColor="#000000"
            defaultAlpha={0.18}
            onChange={v => onUpdate({ dotLegal: v })}
            onReset={() => onUpdate({ dotLegal: "" })}
            testId="color-dot-legal"
          />
          <HighlightColorField
            label="King in check"
            value={ui.highlightCheck}
            defaultColor="#ef4444"
            defaultAlpha={0.45}
            onChange={v => onUpdate({ highlightCheck: v })}
            onReset={() => onUpdate({ highlightCheck: "" })}
            testId="color-highlight-check"
          />
          <HighlightColorField
            label="Threat (novice mode)"
            value={ui.threatHighlight}
            defaultColor="#ff6432"
            defaultAlpha={0.4}
            onChange={v => onUpdate({ threatHighlight: v })}
            onReset={() => onUpdate({ threatHighlight: "" })}
            testId="color-threat"
          />
        </div>

        {/* ── Watermark ── */}
        {hasWatermark && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Watermark</h3>
              <p className="text-xs text-muted-foreground">
                The school owl appears as a translucent watermark centered over the board.
              </p>
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground w-24 shrink-0">Opacity</Label>
                <Slider
                  min={0}
                  max={0.6}
                  step={0.01}
                  value={[ui.watermarkOpacity ?? 0.12]}
                  onValueChange={([v = 0.12]) => onUpdate({ watermarkOpacity: v })}
                  className="flex-1"
                  data-testid="slider-watermark-opacity"
                  aria-label="Watermark opacity"
                />
                <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                  {Math.round((ui.watermarkOpacity ?? 0.12) * 100)}%
                </span>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* ── Coordinates ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold">Coordinates</h3>
            <Switch
              checked={ui.showCoordinates}
              onCheckedChange={v => onUpdate({ showCoordinates: v })}
              data-testid="switch-showCoordinates-appearance"
              aria-label="Show coordinates"
            />
          </div>

          {ui.showCoordinates && (
            <div className="space-y-4 pl-1">
              {/* Position */}
              <div className="flex items-center gap-4">
                <Label className="text-xs text-muted-foreground w-24 shrink-0">Position</Label>
                <div className="flex gap-2">
                  {(["inside", "outside"] as const).map(pos => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => onUpdate({ coordinatePosition: pos })}
                      className={`px-3 py-1 text-xs rounded border transition ${
                        (ui.coordinatePosition ?? "inside") === pos
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                      data-testid={`coord-position-${pos}`}
                    >
                      {pos.charAt(0).toUpperCase() + pos.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground w-24 shrink-0">Color</Label>
                <div
                  className="w-6 h-6 rounded border border-border/60 shrink-0"
                  style={{ background: ui.coordinateColor || "#94a3b8" }}
                />
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(ui.coordinateColor) ? ui.coordinateColor : "#94a3b8"}
                  onChange={e => onUpdate({ coordinateColor: e.target.value })}
                  className="w-8 h-7 cursor-pointer rounded border border-border/60 p-0 bg-transparent"
                  data-testid="color-coordinate"
                  aria-label="Coordinate color"
                />
                {ui.coordinateColor && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ coordinateColor: "" })}
                    className="text-muted-foreground/60 hover:text-muted-foreground"
                    title="Reset coordinate color"
                    aria-label="Reset coordinate color"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Opacity */}
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground w-24 shrink-0">Opacity</Label>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[ui.coordinateOpacity ?? 0.9]}
                  onValueChange={([v = 0.9]) => onUpdate({ coordinateOpacity: v })}
                  className="flex-1"
                  data-testid="slider-coord-opacity"
                  aria-label="Coordinate opacity"
                />
                <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                  {Math.round((ui.coordinateOpacity ?? 0.9) * 100)}%
                </span>
              </div>

              {/* Font size */}
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground w-24 shrink-0">Font size</Label>
                <Slider
                  min={8}
                  max={16}
                  step={1}
                  value={[ui.coordinateFontSize ?? 11]}
                  onValueChange={([v = 11]) => onUpdate({ coordinateFontSize: v })}
                  className="flex-1"
                  data-testid="slider-coord-fontsize"
                  aria-label="Coordinate font size"
                />
                <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                  {ui.coordinateFontSize ?? 11}px
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saved}
            data-testid="btn-save-theme"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saved ? "Saved" : "Save theme"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetToRoyalOwl}
            data-testid="btn-reset-royal-owl"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset to Royal Owl
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetToDefault}
            data-testid="btn-reset-default"
          >
            Reset to Default
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
