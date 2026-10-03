import type { StreamerView } from "../types";
import { Avatar, StatusBadge } from "./ui";
import { activityLine, headline } from "../lib/status";
import { clock, isStale, relative, viewers } from "../lib/format";
import { api } from "../api";

export function StreamerRow({
  view,
  selected,
  showConfidence,
  pollSeconds,
  now,
  onSelect,
}: {
  view: StreamerView;
  selected: boolean;
  showConfidence: boolean;
  pollSeconds: number;
  now: number;
  onSelect: () => void;
}) {
  const { streamer: st, snapshot: s } = view;
  const live = !!s?.is_live;
  const stale = s ? isStale(s.last_updated, pollSeconds) : false;
  return (
    <li
      className={`row row--${(s?.status ?? "OFFLINE").toLowerCase()} ${selected ? "row--selected" : ""}`}
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
    >
      <Avatar url={st.profile_image_url} name={st.display_name} live={live} />
      <div className="row__main">
        <div className="row__title">
          <span className="row__name">{st.display_name}</span>
          {live && <span className="live-pill">LIVE</span>}
          {!st.notifications_enabled && <span className="muted" title="Benachrichtigungen aus">🔕</span>}
          {stale && <span className="stale-pill" title="Seit längerem keine frischen Daten">veraltet</span>}
        </div>
        <div className="row__meta">
          <span>{activityLine(live, s?.game_name ?? null, s?.mode ?? null)}</span>
          {live && s?.viewer_count != null && <span> · {viewers(s.viewer_count)}</span>}
        </div>
        {live && s?.stream_title && <div className="row__stream-title ellipsis" title={s.stream_title}>{s.stream_title}</div>}
      </div>
      <div className="row__status">
        <StatusBadge status={s?.status ?? "OFFLINE"} confidence={s?.confidence} showConfidence={showConfidence} />
        {s && (s.status === "SEARCHING" || s.status === "PARTY_FOUND" || s.status === "IN_MATCH") && (
          <span className="row__headline">{headline(st.display_name, s)}</span>
        )}
        <span className="row__since" title={`Letzte Statusänderung ${clock(s?.status_since)}`}>
          {s ? `seit ${clock(s.status_since)} · ${relative(s.status_since, now)}` : "noch keine Daten"}
        </span>
      </div>
      <div className="row__actions">
        <button
          className="btn btn--twitch"
          onClick={(e) => {
            e.stopPropagation();
            api.openStream(st.login);
          }}
          title={`twitch.tv/${st.login} öffnen`}
        >
          Stream öffnen
        </button>
      </div>
    </li>
  );
}
