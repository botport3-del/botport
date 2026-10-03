import type { ActivityEvent } from "../types";
import { STATUS_EMOJI, STATUS_HISTORY, IS_ESTIMATE, activityLine } from "../lib/status";
import { clock, dayLabel, percent } from "../lib/format";

export function ActivityTimeline({
  events,
  showName,
  showConfidence,
}: {
  events: ActivityEvent[];
  showName?: boolean;
  showConfidence: boolean;
}) {
  const groups: Array<{ day: string; items: ActivityEvent[] }> = [];
  for (const e of events) {
    const day = dayLabel(e.occurred_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }
  return (
    <div className="timeline">
      {groups.map((g) => (
        <section key={g.day}>
          <h4 className="timeline__day">{g.day}</h4>
          <ol>
            {g.items.map((e) => (
              <li key={e.id} className={`timeline__item timeline__item--${e.status.toLowerCase()}`}>
                <time>{clock(e.occurred_at)}</time>
                <span className="timeline__emoji" aria-hidden>{STATUS_EMOJI[e.status]}</span>
                <div className="timeline__text">
                  <span>
                    {showName && <strong>{e.display_name} </strong>}
                    {STATUS_HISTORY[e.status]}
                  </span>
                  <small>
                    {activityLine(e.status !== "OFFLINE", e.game_name, e.mode)}
                    {showConfidence && IS_ESTIMATE[e.status] && e.status !== "UNKNOWN" && ` · Confidence ${percent(e.confidence)}`}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
