import { useEffect, useState } from "react";
import { api } from "../api";
import type { ActivityEvent, RadarState } from "../types";
import { ActivityTimeline } from "../components/ActivityTimeline";
import { Empty } from "../components/ui";

export function ActivityPage({ state, showConfidence }: { state: RadarState; showConfidence: boolean }) {
  const [streamerId, setStreamerId] = useState<number | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  // Refresh whenever any status changes.
  const fingerprint = state.streamers.map((v) => `${v.streamer.id}:${v.snapshot?.status_since}`).join("|");
  useEffect(() => {
    api.getActivity(streamerId, 300).then(setEvents).catch(console.error);
  }, [streamerId, fingerprint]);

  const sorted = [...state.streamers].sort((a, b) =>
    a.streamer.display_name.localeCompare(b.streamer.display_name, "de"),
  );
  const selectedName = sorted.find((v) => v.streamer.id === streamerId)?.streamer.display_name;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>{selectedName ? `${selectedName} – Aktivität` : "Aktivität"}</h1>
          <p className="muted">Aufgezeichnete Statusänderungen der letzten 30 Tage</p>
        </div>
        <div className="page__actions">
          <select value={streamerId ?? ""} onChange={(e) => setStreamerId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Alle Pros</option>
            {sorted.map((v) => (
              <option key={v.streamer.id} value={v.streamer.id}>{v.streamer.display_name}</option>
            ))}
          </select>
          {confirmClear ? (
            <>
              <button className="btn btn--ghost btn--small" onClick={() => setConfirmClear(false)}>Abbrechen</button>
              <button
                className="btn btn--danger btn--small"
                onClick={async () => {
                  await api.clearActivity(streamerId);
                  setEvents([]);
                  setConfirmClear(false);
                }}
              >
                Wirklich löschen
              </button>
            </>
          ) : (
            <button className="btn btn--ghost btn--small" disabled={events.length === 0} onClick={() => setConfirmClear(true)}>
              Verlauf löschen
            </button>
          )}
        </div>
      </header>
      <div className="card">
        {events.length === 0 ? (
          <Empty icon="🕒" title="Noch keine Aktivität">
            <p className="muted">Sobald sich der Status eines Pros ändert, erscheint er hier.</p>
          </Empty>
        ) : (
          <ActivityTimeline events={events} showName={streamerId == null} showConfidence={showConfidence} />
        )}
      </div>
    </div>
  );
}
