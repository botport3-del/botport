import { useEffect, useState } from "react";
import { api, onRadarState } from "../api";
import type { RadarState } from "../types";

export function useRadar(): RadarState | null {
  const [state, setState] = useState<RadarState | null>(null);
  useEffect(() => {
    let alive = true;
    const unlisten = onRadarState((s) => alive && setState(s));
    api.getState().then((s) => alive && setState(s)).catch(console.error);
    return () => {
      alive = false;
      unlisten.then((fn) => fn());
    };
  }, []);
  return state;
}

/** Re-render periodically so relative times ("vor 3 Min.") stay current. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}
