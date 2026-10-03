// Demo backend used only when the UI runs in a plain browser (vite dev without
// Tauri). It simulates status changes so the interface can be previewed.
import type {
  ActivityEvent,
  AuthEvent,
  RadarState,
  Settings,
  Snapshot,
  Status,
  StreamerView,
} from "./types";

const defaultSettings: Settings = {
  twitch_client_id: "demo-client-id",
  poll_interval_seconds: 60,
  fast_mode: true,
  use_chat_signals: true,
  notify_live: false,
  notify_searching: true,
  notify_party_found: true,
  notify_in_match: false,
  notify_offline: false,
  notify_min_confidence: 55,
  notify_cooldown_minutes: 3,
  notify_sound: true,
  quiet_hours_enabled: false,
  quiet_hours_start: "23:00",
  quiet_hours_end: "08:00",
  show_confidence: true,
  close_to_tray: true,
};

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const CYCLE: Array<{ status: Status; confidence: number; signals: string[]; title: string }> = [
  { status: "LIVE", confidence: 1, signals: ["category:cod"], title: "RANKED GRIND 🏆 !discord" },
  {
    status: "SEARCHING",
    confidence: 0.87,
    signals: ["category:cod", "title:changed", "title:lf-n", "chat:broadcaster:need-n"],
    title: "RANKED GRIND | LF1 🏆 !discord",
  },
  {
    status: "PARTY_FOUND",
    confidence: 0.74,
    signals: ["category:cod", "title:changed", "transition:search-ended"],
    title: "RANKED GRIND 🏆 !discord",
  },
  {
    status: "IN_MATCH",
    confidence: 0.68,
    signals: ["category:cod", "transition:party-settled"],
    title: "RANKED GRIND 🏆 !discord",
  },
];

let nextId = 5;
let views: StreamerView[] = [
  view(1, "pirate", "Pirate", true, "SEARCHING", 0.87, 3, ["category:cod", "title:lf-n", "chat:broadcaster:need-n"], "RANKED GRIND | LF1 🏆", "Ranked", 1),
  view(2, "dki", "Dki", true, "IN_MATCH", 0.92, 6, ["category:cod", "title:in-match", "transition:party-settled"], "Ranked mit den Jungs | in match", "Ranked", null),
  view(3, "warzone_pro3", "Spieler 3", false, "OFFLINE", 1, 120, [], null, null, null),
  view(4, "resurgence_king", "Spieler 4", true, "LIVE", 1, 14, ["category:cod"], "Resurgence Quads all day", "Resurgence", null),
];

let activity: ActivityEvent[] = [
  act(1, 1, "LIVE", 1, 42),
  act(2, 1, "SEARCHING", 0.81, 36),
  act(3, 1, "PARTY_FOUND", 0.74, 33),
  act(4, 1, "IN_MATCH", 0.7, 31),
  act(5, 1, "SEARCHING", 0.87, 3),
  act(6, 2, "LIVE", 1, 50),
  act(7, 2, "IN_MATCH", 0.92, 6),
].reverse();

function view(
  id: number,
  login: string,
  name: string,
  live: boolean,
  status: Status,
  confidence: number,
  since: number,
  signals: string[],
  title: string | null,
  mode: string | null,
  needed: number | null,
): StreamerView {
  const snapshot: Snapshot = {
    streamer_id: id,
    is_live: live,
    stream_title: title,
    game_name: live ? "Call of Duty: Warzone" : null,
    mode,
    viewer_count: live ? 1200 + id * 3417 : null,
    started_at: live ? minutesAgo(90 + id * 7) : null,
    status,
    confidence,
    signals,
    players_needed: needed,
    status_since: minutesAgo(since),
    title_since: minutesAgo(since),
    last_updated: new Date().toISOString(),
  };
  return {
    streamer: {
      id,
      login,
      display_name: name,
      twitch_user_id: String(id),
      profile_image_url: null,
      notifications_enabled: true,
      added_at: minutesAgo(10_000),
    },
    snapshot,
  };
}

function act(id: number, sid: number, status: Status, confidence: number, ago: number): ActivityEvent {
  const v = views.find((x) => x.streamer.id === sid)!;
  return {
    id,
    streamer_id: sid,
    login: v.streamer.login,
    display_name: v.streamer.display_name,
    status,
    confidence,
    stream_title: v.snapshot?.stream_title ?? null,
    game_name: "Call of Duty: Warzone",
    mode: "Ranked",
    occurred_at: minutesAgo(ago),
  };
}

let settings = { ...defaultSettings };
let authenticated = true;
const listeners = new Set<(s: RadarState) => void>();
const authListeners = new Set<(e: AuthEvent) => void>();

function state(): RadarState {
  return {
    streamers: views,
    health: {
      authenticated,
      login: authenticated ? "demo_user" : null,
      client_id_set: settings.twitch_client_id.length > 0,
      last_success: new Date().toISOString(),
      last_error: null,
      chat_connected: settings.use_chat_signals,
      chat_enabled: settings.use_chat_signals,
      poll_interval_seconds: settings.poll_interval_seconds,
    },
  };
}

function emit() {
  const s = state();
  listeners.forEach((l) => l(s));
}

let tick = 0;
function simulate() {
  tick++;
  const v = views.find((x) => x.streamer.id === 4);
  if (!v?.snapshot) return;
  const step = CYCLE[tick % CYCLE.length];
  v.snapshot = {
    ...v.snapshot,
    status: step.status,
    confidence: step.confidence,
    signals: step.signals,
    stream_title: step.title,
    players_needed: step.status === "SEARCHING" ? 2 : null,
    status_since: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };
  activity = [
    { ...act(Date.now(), 4, step.status, step.confidence, 0), stream_title: step.title },
    ...activity,
  ];
  emit();
}

let timer: number | undefined;

export const mockBackend = {
  subscribe(cb: (s: RadarState) => void) {
    timer ??= window.setInterval(simulate, 12_000);
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  onAuth(cb: (e: AuthEvent) => void) {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },
  async call(cmd: string, args: any): Promise<unknown> {
    switch (cmd) {
      case "get_state":
        return state();
      case "get_settings":
        return settings;
      case "save_settings":
        settings = { ...args.settings };
        emit();
        return settings;
      case "get_activity":
        return [...activity]
          .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
          .filter((a) => args?.streamerId == null || a.streamer_id === args.streamerId)
          .slice(0, args?.limit ?? 200);
      case "clear_activity":
        activity = activity.filter((a) => args?.streamerId != null && a.streamer_id !== args.streamerId);
        return;
      case "add_streamers": {
        const names = String(args.input).split(/[\s,;]+/).filter(Boolean);
        const added: string[] = [];
        for (const n of names) {
          const login = n.toLowerCase();
          if (views.some((v) => v.streamer.login === login)) continue;
          views = [...views, view(nextId++, login, n, false, "OFFLINE", 1, 0, [], null, null, null)];
          added.push(n);
        }
        emit();
        return { added, already: [], not_found: [], invalid: [] };
      }
      case "remove_streamer":
        views = views.filter((v) => v.streamer.id !== args.id);
        emit();
        return;
      case "set_streamer_notifications":
        views = views.map((v) =>
          v.streamer.id === args.id
            ? { ...v, streamer: { ...v.streamer, notifications_enabled: args.enabled } }
            : v,
        );
        emit();
        return;
      case "auth_start":
        window.setTimeout(() => {
          authenticated = true;
          authListeners.forEach((l) => l({ status: "success", message: "demo_user" }));
          emit();
        }, 4000);
        return { user_code: "ABCD-EFGH", verification_uri: "https://www.twitch.tv/activate", expires_in: 1800 };
      case "auth_logout":
        authenticated = false;
        emit();
        return;
      case "suggest_followed":
        return [
          { login: "cod_streamer_a", display_name: "COD_Streamer_A", game_name: "Call of Duty: Warzone", title: "Ranked LF2", viewer_count: 4200 },
        ];
      case "open_stream":
        window.open(`https://www.twitch.tv/${encodeURIComponent(args.login)}`, "_blank", "noopener");
        return;
      default:
        return;
    }
  },
};
