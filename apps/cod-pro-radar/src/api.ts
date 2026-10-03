import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ActivityEvent,
  AddResult,
  AuthEvent,
  DeviceStart,
  RadarState,
  Settings,
  Suggestion,
} from "./types";
import { mockBackend } from "./mock";

export const inTauri = isTauri();

type Commands = {
  get_state: [void, RadarState];
  add_streamers: [{ input: string }, AddResult];
  remove_streamer: [{ id: number }, void];
  set_streamer_notifications: [{ id: number; enabled: boolean }, void];
  get_activity: [{ streamerId?: number | null; limit?: number }, ActivityEvent[]];
  clear_activity: [{ streamerId?: number | null }, void];
  get_settings: [void, Settings];
  save_settings: [{ settings: Settings }, Settings];
  auth_start: [void, DeviceStart];
  auth_cancel: [void, void];
  auth_logout: [void, void];
  open_stream: [{ login: string }, void];
  open_verification: [void, void];
  open_twitch_console: [void, void];
  refresh_now: [void, void];
  suggest_followed: [void, Suggestion[]];
  test_notification: [void, void];
};

function call<K extends keyof Commands>(
  cmd: K,
  args?: Commands[K][0],
): Promise<Commands[K][1]> {
  if (!inTauri) {
    return mockBackend.call(cmd, args) as Promise<Commands[K][1]>;
  }
  return invoke<Commands[K][1]>(cmd, (args ?? undefined) as Record<string, unknown> | undefined);
}

export const api = {
  getState: () => call("get_state"),
  addStreamers: (input: string) => call("add_streamers", { input }),
  removeStreamer: (id: number) => call("remove_streamer", { id }),
  setStreamerNotifications: (id: number, enabled: boolean) =>
    call("set_streamer_notifications", { id, enabled }),
  getActivity: (streamerId: number | null, limit = 200) =>
    call("get_activity", { streamerId, limit }),
  clearActivity: (streamerId: number | null) => call("clear_activity", { streamerId }),
  getSettings: () => call("get_settings"),
  saveSettings: (settings: Settings) => call("save_settings", { settings }),
  authStart: () => call("auth_start"),
  authCancel: () => call("auth_cancel"),
  authLogout: () => call("auth_logout"),
  openStream: (login: string) => call("open_stream", { login }),
  openVerification: () => call("open_verification"),
  openTwitchConsole: () => call("open_twitch_console"),
  refreshNow: () => call("refresh_now"),
  suggestFollowed: () => call("suggest_followed"),
  testNotification: () => call("test_notification"),
};

export function onRadarState(cb: (s: RadarState) => void): Promise<UnlistenFn> {
  if (!inTauri) return Promise.resolve(mockBackend.subscribe(cb));
  return listen<RadarState>("radar://state", (e) => cb(e.payload));
}

export function onAuthEvent(cb: (e: AuthEvent) => void): Promise<UnlistenFn> {
  if (!inTauri) return Promise.resolve(mockBackend.onAuth(cb));
  return listen<AuthEvent>("radar://auth", (e) => cb(e.payload));
}

export function errorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return "Unbekannter Fehler";
}
