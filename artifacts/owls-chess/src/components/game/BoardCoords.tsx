/**
 * BoardCoords — custom board coordinate overlay.
 *
 * Renders rank (1-8) and file (a-h) labels with full control over color,
 * opacity, font size, and position (inside the board or outside). Always
 * rendered as an absolute-positioned overlay so the parent board wrapper
 * must have `position: relative` and, for "outside" mode, `overflow: visible`
 * plus enough padding to show the labels without clipping.
 */
import type { CSSProperties } from "react";

interface BoardCoordsProps {
  /** Board orientation determines label order. */
  orientation: "white" | "black";
  /** Inside = small labels at square corners. Outside = labels in the margin. */
  position: "inside" | "outside";
  /** CSS color string for the label text. */
  color: string;
  /** 0..1 opacity applied to the label container. */
  opacity: number;
  /** Font size in px. */
  fontSize: number;
  /** When false, renders nothing. */
  show: boolean;
}

export function BoardCoords({ orientation, position, color, opacity, fontSize, show }: BoardCoordsProps) {
  if (!show) return null;

  const files = orientation === "white"
    ? ["a", "b", "c", "d", "e", "f", "g", "h"]
    : ["h", "g", "f", "e", "d", "c", "b", "a"];
  const ranks = orientation === "white"
    ? ["8", "7", "6", "5", "4", "3", "2", "1"]
    : ["1", "2", "3", "4", "5", "6", "7", "8"];

  const baseText: CSSProperties = {
    color,
    fontSize: `${fontSize}px`,
    fontFamily: "monospace",
    fontWeight: 700,
    lineHeight: 1,
    userSelect: "none",
    pointerEvents: "none",
    letterSpacing: 0,
  };

  if (position === "outside") {
    const pad = Math.round(fontSize * 1.5);
    return (
      <>
        {/* Ranks — left margin */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: -pad,
            top: 0,
            bottom: 0,
            width: pad,
            display: "flex",
            flexDirection: "column",
            opacity,
            pointerEvents: "none",
          }}
        >
          {ranks.map(r => (
            <div key={r} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", ...baseText }}>
              {r}
            </div>
          ))}
        </div>
        {/* Files — bottom margin */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -pad,
            left: 0,
            right: 0,
            height: pad,
            display: "flex",
            opacity,
            pointerEvents: "none",
          }}
        >
          {files.map(f => (
            <div key={f} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", ...baseText }}>
              {f}
            </div>
          ))}
        </div>
      </>
    );
  }

  // Inside position — small labels at the inner edge of the border squares
  return (
    <>
      {/* Ranks — left inner edge */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "12.5%",
          display: "flex",
          flexDirection: "column",
          opacity,
          pointerEvents: "none",
          zIndex: 3,
        }}
      >
        {ranks.map(r => (
          <div key={r} style={{ flex: 1, display: "flex", alignItems: "flex-start", paddingTop: 2, paddingLeft: 2, ...baseText }}>
            {r}
          </div>
        ))}
      </div>
      {/* Files — bottom inner edge */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "12.5%",
          display: "flex",
          opacity,
          pointerEvents: "none",
          zIndex: 3,
        }}
      >
        {files.map(f => (
          <div key={f} style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", paddingRight: 2, paddingBottom: 2, ...baseText }}>
            {f}
          </div>
        ))}
      </div>
    </>
  );
}
