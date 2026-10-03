export type Status =
  | "OFFLINE"
  | "LIVE"
  | "SEARCHING"
  | "PARTY_FOUND"
  | "IN_MATCH"
  | "UNKNOWN";

export interface Streamer {
  id: number;
  login: string;
  display_name: string;
  twitch_user_id: string | null;
  profile_image_url: string | null;
  notifications_enabled: boolean;
  added_at: string;
}

export interface Snapshot {
  streamer_id: number;
  is_live: boolean;
  stream_title: string | null;
  game_name: string | null;
  mode: string | null;
  viewer_count: number | null;
  started_at: string | null;
  status: Status;
  confidence: number;
  signals: string[];
  players_needed: number | null;
  status_since: string;
  title_since: string;
  last_updated: string;
}

export interface StreamerView {
  streamer: Streamer;
  snapshot: Snapshot | null;
}

export interface Health {
  authenticated: boolean;
  login: string | null;
  client_id_set: boolean;
  last_success: string | null;
  last_error: string | null;
  chat_connected: boolean;
  chat_enabled: boolean;
  poll_interval_seconds: number;
}

export interface RadarState {
  streamers: StreamerView[];
  health: Health;
}

export interface ActivityEvent {
  id: number;
  streamer_id: number;
  login: string;
  display_name: string;
  status: Status;
  confidence: number;
  stream_title: string | null;
  game_name: string | null;
  mode: string | null;
  occurred_at: string;
}

export interface Settings {
  twitch_client_id: string;
  poll_interval_seconds: number;
  fast_mode: boolean;
  use_chat_signals: boolean;
  notify_live: boolean;
  notify_searching: boolean;
  notify_party_found: boolean;
  notify_in_match: boolean;
  notify_offline: boolean;
  notify_min_confidence: number;
  notify_cooldown_minutes: number;
  notify_sound: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  show_confidence: boolean;
  close_to_tray: boolean;
}

export interface AddResult {
  added: string[];
  already: string[];
  not_found: string[];
  invalid: string[];
}

export interface DeviceStart {
  user_code: string;
  verification_uri: string;
  expires_in: number;
}

export interface AuthEvent {
  status: "success" | "expired" | "denied" | "error";
  message: string | null;
}

export interface Suggestion {
  login: string;
  display_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
}
