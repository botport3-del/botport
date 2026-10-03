import { useMemo, useState } from "react";
import type { RadarState, Status } from "../types";
import { StreamerRow } from "../components/StreamerRow";
import { StreamerDetail } from "../components/StreamerDetail";
import { AddStreamerDialog } from "../components/AddStreamerDialog";
import { ConnectTwitch } from "../components/ConnectTwitch";
import { Empty } from "../components/ui";
import { statusRank } from "../lib/status";
import { useNow } from "../hooks/useRadar";

type Filter = "all" | "live" | "searching" | "offline";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "live", label: "Live" },
  { id: "searching", label: "Sucht" },
  { id: "offline", label: "Offline" },
];

export function ProsPage({ state, showConfidence }: { state: RadarState; showConfidence: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const now = useNow();
  const { streamers, health } = state;

  const count = (pred: (s: Status | undefined, live: boolean) => boolean) =>
    streamers.filter((v) => pred(v.snapshot?.status, !!v.snapshot?.is_live)).length;
  const stats = {
    live: count((_, live) => live),
    searching: count((s) => s === "SEARCHING"),
    match: count((s) => s === "IN_MATCH"),
    party: count((s) => s === "PARTY_FOUND"),
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return streamers
      .filter((v) => {
        const live = !!v.snapshot?.is_live;
        if (filter === "live" && !live) return false;
        if (filter === "offline" && live) return false;
        if (filter === "searching" && v.snapshot?.status !== "SEARCHING") return false;
        if (q && !v.streamer.display_name.toLowerCase().includes(q) && !v.streamer.login.includes(q)) return false;
        return true;
      })
      .sort(
        (a, b) =>
          statusRank(a.snapshot) - statusRank(b.snapshot) ||
          a.streamer.display_name.localeCompare(b.streamer.display_name, "de"),
      );
  }, [streamers, filter, query]);

  const selectedView = streamers.find((v) => v.streamer.id === selected) ?? null;

  return (
    <div className={`page pros ${selectedView ? "pros--with-detail" : ""}`}>
      <div className="pros__main">
        <header className="page__header">
          <div>
            <h1>Meine COD Pros</h1>
            <p className="muted">Live-Radar für deine ausgewählten Twitch-Kanäle</p>
          </div>
          <button className="btn btn--primary" onClick={() => setAdding(true)}>+ Pro hinzufügen</button>
        </header>

        <div className="stats">
          <div className="stat stat--live"><span>🔴</span><strong>{stats.live}</strong><small>Live</small></div>
          <div className="stat stat--searching"><span>🟡</span><strong>{stats.searching}</strong><small>Suche erkannt</small></div>
          <div className="stat stat--party"><span>🟢</span><strong>{stats.party}</strong><small>Party gefunden</small></div>
          <div className="stat stat--match"><span>🔵</span><strong>{stats.match}</strong><small>Im Match</small></div>
        </div>

        {!health.authenticated && <ConnectTwitch health={health} compact />}

        <div className="toolbar">
          <div className="segmented" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                className={filter === f.id ? "active" : ""}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            className="search"
            type="search"
            placeholder="Pro suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {streamers.length === 0 ? (
          <Empty icon="📡" title="Noch keine Pros auf dem Radar">
            <p className="muted">Füge Twitch-Kanäle hinzu, z. B. Pirate oder Dki.</p>
            <button className="btn btn--primary" onClick={() => setAdding(true)}>+ Ersten Pro hinzufügen</button>
          </Empty>
        ) : list.length === 0 ? (
          <Empty icon="🔍" title="Keine Treffer für diesen Filter" />
        ) : (
          <ul className="rows">
            {list.map((v) => (
              <StreamerRow
                key={v.streamer.id}
                view={v}
                selected={v.streamer.id === selected}
                showConfidence={showConfidence}
                pollSeconds={health.poll_interval_seconds}
                now={now}
                onSelect={() => setSelected(v.streamer.id === selected ? null : v.streamer.id)}
              />
            ))}
          </ul>
        )}
        <p className="disclaimer">
          Status wie „Suche“, „Party gefunden“ oder „Im Match“ werden aus öffentlichen Twitch-Signalen geschätzt und sind nie garantiert.
        </p>
      </div>

      {selectedView && (
        <StreamerDetail view={selectedView} showConfidence={showConfidence} now={now} onClose={() => setSelected(null)} />
      )}
      {adding && <AddStreamerDialog authenticated={health.authenticated} onClose={() => setAdding(false)} />}
    </div>
  );
}
