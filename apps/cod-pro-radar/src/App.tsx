import { useEffect, useState } from "react";
import { api, inTauri } from "./api";
import { useNow, useRadar } from "./hooks/useRadar";
import { ProsPage } from "./pages/ProsPage";
import { ActivityPage } from "./pages/ActivityPage";
import { SettingsPage } from "./pages/SettingsPage";
import type { Settings } from "./types";
import { relative } from "./lib/format";

type Page = "pros" | "activity" | "settings";

const NAV: Array<{ id: Page; label: string; icon: string }> = [
  { id: "pros", label: "Meine Pros", icon: "📡" },
  { id: "activity", label: "Aktivität", icon: "🕒" },
  { id: "settings", label: "Einstellungen", icon: "⚙" },
];

export default function App() {
  const state = useRadar();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [page, setPage] = useState<Page>("pros");
  const now = useNow(15_000);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
  }, []);

  if (!state || !settings) {
    return (
      <div className="boot">
        <div className="radar-logo radar-logo--spin" aria-hidden />
        <p>COD Pro Radar startet…</p>
      </div>
    );
  }

  const { health } = state;
  const searching = state.streamers.filter((v) => v.snapshot?.status === "SEARCHING").length;

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <div className="radar-logo" aria-hidden />
          <div>
            <strong>COD Pro Radar</strong>
            <small>Twitch Live-Radar</small>
          </div>
        </div>
        <ul>
          {NAV.map((n) => (
            <li key={n.id}>
              <button className={page === n.id ? "active" : ""} onClick={() => setPage(n.id)}>
                <span aria-hidden>{n.icon}</span>
                {n.label}
                {n.id === "pros" && searching > 0 && <span className="nav-count">{searching}</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="sidebar__status">
          <div className={`health ${health.authenticated ? (health.last_error ? "health--warn" : "health--ok") : "health--off"}`}>
            <span className="health__dot" />
            <div>
              <strong>
                {!health.authenticated ? "Nicht verbunden" : health.last_error ? "Verbindungsproblem" : "Radar aktiv"}
              </strong>
              <small>
                {health.last_success ? `Update ${relative(health.last_success, now)}` : "Noch kein Update"}
                {health.authenticated && ` · alle ${health.poll_interval_seconds}s`}
              </small>
            </div>
          </div>
          <button className="btn btn--ghost btn--small btn--block" onClick={() => api.refreshNow()} disabled={!health.authenticated}>
            ↻ Jetzt aktualisieren
          </button>
          {!inTauri && <p className="demo-pill">Demo-Modus (Browser)</p>}
        </div>
      </nav>

      <main className="content">
        {page === "pros" && <ProsPage state={state} showConfidence={settings.show_confidence} />}
        {page === "activity" && <ActivityPage state={state} showConfidence={settings.show_confidence} />}
        {page === "settings" && <SettingsPage settings={settings} health={health} onChange={setSettings} />}
      </main>
    </div>
  );
}
