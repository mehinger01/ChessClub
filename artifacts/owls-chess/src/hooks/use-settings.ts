import { useEffect, useState } from "react";
import { loadSettings, updateSettings } from "../providers";
import type { AppSettings } from "../providers/types";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    const handler = () => setSettings(loadSettings());
    window.addEventListener("owls-settings", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("owls-settings", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    const next = updateSettings(patch);
    setSettings(next);
    return next;
  };

  return { settings, update };
}
