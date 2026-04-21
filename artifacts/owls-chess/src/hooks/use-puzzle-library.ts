import { useEffect, useState } from "react";
import { getProviders } from "../providers";
import type { Puzzle } from "../lib/storage";

export function usePuzzleLibrary() {
  const [library, setLibrary] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const lib = await getProviders().puzzleSource.loadLibrary();
      if (!cancelled) {
        setLibrary(lib);
        setLoading(false);
      }
    };
    load();
    const handler = () => load();
    window.addEventListener("owls-puzzles", handler);
    return () => { cancelled = true; window.removeEventListener("owls-puzzles", handler); };
  }, []);

  return { library, loading };
}
