import { useEffect, useState } from "react";
import { api } from "../api";
import type { ActivityEvent, StreamerView } from "../types";
import { ActivityTimeline } from "./ActivityTimeline";
import { Avatar, ConfidenceMeter, StatusBadge, Toggle } from "./ui";
import {
  IS_ESTIMATE,
  STATUS_DESCRIPTION,
  activityLine,
  explainSignal,
  headline,
} from "../lib/status";
import { clock, percent, relative, uptime, viewers } from "../lib/format";

export function StreamerDetail({
  view,
  showConfidence,
  now,
  onClose,
}: {
  view: StreamerView;
  showConfidence: boolean;
  now: number;
  onClose: () => void;
}) {
  const { streamer: st, snapshot: s } = view;
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Reload history whenever the status changes.
  const statusKey = `${st.id}:${s?.status}:${s?.status_since}`;
  useEffect(() => {
    api.getActivity(st.id, 50).then(setEvents).catch(console.error);
  }, [statusKey, st.id]);

  const live = !!s?.is_live;
  const estimate = s ? IS_ESTIMATE[s.status] && s.status !== "UNKNOWN" : false;
  const reasons = s ? s.signals.flatMap(explainSignal) : [];

  return (
    <aside className="detail">
      <header className="detail__header">
        <Avatar url={st.profile_image_url} name={st.display_name} live={live} size={64} />
        <div>
          <h2>{st.display_name}</h2>
          <span className="muted">twitch.tv/{st.login}</span>
        </div>
        <button className="icon-btn detail__close" onClick={onClose} aria-label="Details schließen">✕</button>
      </header>

      <section className={`detail__status detail__status--${(s?.status ?? "OFFLINE").toLowerCase()}`}>
        <StatusBadge status={s?.status ?? "OFFLINE"} />
        <p className="detail__headline">{headline(st.display_name, s)}</p>
        <p className="muted">{s ? STATUS_DESCRIPTION[s.status] : "Noch keine Daten von Twitch."}</p>
        {s && <p className="muted small">Letzte Statusänderung: {clock(s.status_since)} ({relative(s.status_since, now)})</p>}
        {estimate && showConfidence && s && (
          <div className="detail__confidence">
            <div className="detail__confidence-head">
              <span>Confidence</span>
              <strong>{percent(s.confidence)}</strong>
            </div>
            <ConfidenceMeter value={s.confidence} />
            <p className="muted small">Geschätzt aus öffentlichen Twitch-Signalen – keine Garantie.</p>
          </div>
        )}
      </section>

      {live && s && (
        <section className="detail__section">
          <h3>Stream</h3>
          <dl className="facts">
            <dt>Spiel</dt>
            <dd>{activityLine(true, s.game_name, s.mode)}</dd>
            <dt>Titel</dt>
            <dd>{s.stream_title || "–"}</dd>
            <dt>Zuschauer</dt>
            <dd>{viewers(s.viewer_count) || "–"}</dd>
            <dt>Live seit</dt>
            <dd>{s.started_at ? `${clock(s.started_at)} (${uptime(s.started_at)})` : "–"}</dd>
          </dl>
          <button className="btn btn--twitch btn--block" onClick={() => api.openStream(st.login)}>
            Stream öffnen
          </button>
        </section>
      )}

      {reasons.length > 0 && (
        <section className="detail__section">
          <h3>Erkannte Hinweise</h3>
          <ul className="signals">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="detail__section">
        <h3>{st.display_name} – Aktivität</h3>
        {events.length === 0 ? (
          <p className="muted">Noch keine Statusänderungen aufgezeichnet.</p>
        ) : (
          <ActivityTimeline events={events} showConfidence={showConfidence} />
        )}
      </section>

      <section className="detail__section">
        <Toggle
          label="Benachrichtigungen für diesen Pro"
          checked={st.notifications_enabled}
          onChange={(v) => api.setStreamerNotifications(st.id, v)}
        />
        {!confirmRemove ? (
          <button className="btn btn--danger-ghost btn--block" onClick={() => setConfirmRemove(true)}>
            Aus „Meine Pros“ entfernen
          </button>
        ) : (
          <div className="confirm">
            <span>{st.display_name} und die Historie entfernen?</span>
            <button className="btn btn--ghost btn--small" onClick={() => setConfirmRemove(false)}>Abbrechen</button>
            <button
              className="btn btn--danger btn--small"
              onClick={async () => {
                await api.removeStreamer(st.id);
                onClose();
              }}
            >
              Entfernen
            </button>
          </div>
        )}
      </section>
    </aside>
  );
}
