/**
 * AnnotationPopover — capture a per-move teaching annotation.
 *
 * Wraps a small trigger button (rendered by the parent NotationPanel row) and
 * opens a popover with the three reflection prompts (intent / worry / retro)
 * plus a freeform student note. Saves to gameStore.setAnnotation on submit.
 *
 * The popover deliberately doesn't auto-save on blur — students are
 * encouraged to think before committing, and saving has explicit feedback
 * via the "Save note" button.
 */
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Pencil } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import { cn } from "../../lib/utils";

export interface AnnotationPopoverProps {
  moveIndex: number;
  san: string;
}

export function AnnotationPopover({ moveIndex, san }: AnnotationPopoverProps) {
  const annotation = useGameStore(s => s.annotations[moveIndex]);
  const setAnnotation = useGameStore(s => s.setAnnotation);
  const hasNote = !!annotation && (
    !!annotation.studentText ||
    !!annotation.prompts?.intent ||
    !!annotation.prompts?.worry ||
    !!annotation.prompts?.retro
  );

  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState("");
  const [worry, setWorry] = useState("");
  const [retro, setRetro] = useState("");
  const [note, setNote] = useState("");

  // Hydrate the form from the stored annotation each time the popover opens
  // so cross-move navigation always reflects the latest persisted state.
  useEffect(() => {
    if (!open) return;
    setIntent(annotation?.prompts?.intent ?? "");
    setWorry(annotation?.prompts?.worry ?? "");
    setRetro(annotation?.prompts?.retro ?? "");
    setNote(annotation?.studentText ?? "");
  }, [open, annotation]);

  const onSave = () => {
    setAnnotation(moveIndex, {
      moveIndex,
      studentText: note.trim() || undefined,
      prompts: {
        intent: intent.trim() || undefined,
        worry: worry.trim() || undefined,
        retro: retro.trim() || undefined,
      },
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${hasNote ? "Edit" : "Add"} note for ${san}`}
          className={cn(
            "shrink-0 w-5 h-5 inline-flex items-center justify-center rounded transition-colors",
            "opacity-0 group-hover:opacity-100 focus:opacity-100",
            hasNote ? "opacity-100 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
          data-testid={`annotate-${moveIndex}`}
          onClick={e => e.stopPropagation()}
        >
          <Pencil className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 p-3 space-y-3" data-testid="annotation-popover">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Note for move</div>
          <div className="font-mono text-sm font-semibold">{san}</div>
        </div>

        <Field label="What were you trying to do?" value={intent} onChange={setIntent} testId="annotation-intent" />
        <Field label="What were you worried about?" value={worry} onChange={setWorry} testId="annotation-worry" />
        <Field label="Looking back, what would you change?" value={retro} onChange={setRetro} testId="annotation-retro" />

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Free note</label>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Anything else worth remembering..."
            data-testid="annotation-note"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} data-testid="annotation-cancel">Cancel</Button>
          <Button size="sm" onClick={onSave} data-testid="annotation-save">Save note</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
}

function Field({ label, value, onChange, testId }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={1}
        className="min-h-[2.25rem] resize-y"
        data-testid={testId}
      />
    </div>
  );
}
