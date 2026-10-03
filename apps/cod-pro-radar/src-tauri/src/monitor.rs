use crate::chat::ChatHub;
use crate::db::{Db, SnapshotRow, StreamerRow};
use crate::detector::{detect, ChatSignals, Memory, Observation, Status};
use crate::notify;
use crate::twitch::{HelixStream, TwitchClient, TwitchError};
use chrono::{DateTime, Duration, Utc};
use serde::Serialize;
use std::collections::{BTreeSet, HashMap};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Notify;

pub const STATE_EVENT: &str = "radar://state";
const EVAL_TICK: std::time::Duration = std::time::Duration::from_secs(10);
const FAST_POLL_SECS: u64 = 20;
const PROFILE_REFRESH_HOURS: i64 = 24;

#[derive(Default)]
struct Runtime {
    memories: HashMap<i64, Memory>,
    /// Latest fetched stream per streamer id; `None` means offline.
    streams: HashMap<i64, Option<HelixStream>>,
    last_fetch: Option<Instant>,
    last_success: Option<DateTime<Utc>>,
    last_error: Option<String>,
    last_notified: HashMap<(i64, Status), DateTime<Utc>>,
    first_cycle_done: bool,
}

pub struct AppState {
    pub db: Db,
    pub twitch: TwitchClient,
    pub chat: ChatHub,
    pub wake: Notify,
    runtime: Mutex<Runtime>,
}

#[derive(Serialize, Clone)]
pub struct StreamerView {
    pub streamer: StreamerRow,
    pub snapshot: Option<SnapshotRow>,
}

#[derive(Serialize, Clone)]
pub struct Health {
    pub authenticated: bool,
    pub login: Option<String>,
    pub client_id_set: bool,
    pub last_success: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub chat_connected: bool,
    pub chat_enabled: bool,
    pub poll_interval_seconds: u64,
}

#[derive(Serialize, Clone)]
pub struct RadarState {
    pub streamers: Vec<StreamerView>,
    pub health: Health,
}

fn parse_time(s: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s).ok().map(|d| d.with_timezone(&Utc))
}

impl AppState {
    pub fn new(db: Db) -> Self {
        AppState {
            db,
            twitch: TwitchClient::new(),
            chat: ChatHub::start(),
            wake: Notify::new(),
            runtime: Mutex::new(Runtime::default()),
        }
    }

    fn rt(&self) -> std::sync::MutexGuard<'_, Runtime> {
        self.runtime.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn forget_streamer(&self, id: i64) {
        let mut rt = self.rt();
        rt.memories.remove(&id);
        rt.streams.remove(&id);
    }

    fn effective_interval(&self, base: u32, fast_mode: bool) -> u64 {
        let base = u64::from(base);
        if !fast_mode {
            return base;
        }
        let active = self
            .rt()
            .memories
            .values()
            .any(|m| matches!(m.status, Status::Searching | Status::PartyFound));
        if active {
            base.min(FAST_POLL_SECS)
        } else {
            base
        }
    }

    pub async fn snapshot_state(&self) -> RadarState {
        let settings = self.db.settings();
        let token = self.twitch.current().await;
        let streamers = self.db.list_streamers().unwrap_or_default();
        let mut snaps: HashMap<i64, SnapshotRow> = self
            .db
            .snapshots()
            .unwrap_or_default()
            .into_iter()
            .map(|s| (s.streamer_id, s))
            .collect();
        let (last_success, last_error) = {
            let rt = self.rt();
            (rt.last_success, rt.last_error.clone())
        };
        let interval = self.effective_interval(settings.poll_interval_seconds, settings.fast_mode);
        RadarState {
            streamers: streamers
                .into_iter()
                .map(|s| {
                    let snapshot = snaps.remove(&s.id);
                    StreamerView { streamer: s, snapshot }
                })
                .collect(),
            health: Health {
                authenticated: token.is_some(),
                login: token.map(|t| t.login),
                client_id_set: !settings.twitch_client_id.is_empty(),
                last_success,
                last_error,
                chat_connected: self.chat.is_connected(),
                chat_enabled: settings.use_chat_signals,
                poll_interval_seconds: interval,
            },
        }
    }

    /// Pull fresh profile and stream data from Helix. Batched: one request per
    /// 100 channels for streams, profiles only when missing or older than a day.
    async fn fetch(&self, client_id: &str) -> Result<(), TwitchError> {
        let token = self.twitch.ensure_token(client_id).await?;
        let streamers = self.db.list_streamers().unwrap_or_default();
        let now = Utc::now();

        let missing: Vec<String> = streamers
            .iter()
            .filter(|s| s.twitch_user_id.is_none())
            .map(|s| s.login.clone())
            .collect();
        let stale: Vec<String> = streamers
            .iter()
            .filter(|s| {
                s.twitch_user_id.is_some()
                    && s.profile_refreshed_at
                        .is_none_or(|t| now - t > Duration::hours(PROFILE_REFRESH_HOURS))
            })
            .filter_map(|s| s.twitch_user_id.clone())
            .collect();
        let mut users = Vec::new();
        if !missing.is_empty() {
            users.extend(self.twitch.users_by_login(&token, &missing).await?);
        }
        if !stale.is_empty() {
            users.extend(self.twitch.users_by_id(&token, &stale).await?);
        }
        for u in &users {
            if let Some(s) = streamers
                .iter()
                .find(|s| s.twitch_user_id.as_deref() == Some(u.id.as_str()) || s.login == u.login)
            {
                let _ = self.db.update_profile(s.id, &u.login, &u.display_name, &u.id, Some(&u.profile_image_url));
            }
        }

        let streamers = self.db.list_streamers().unwrap_or_default();
        let ids: Vec<String> = streamers.iter().filter_map(|s| s.twitch_user_id.clone()).collect();
        let live = if ids.is_empty() {
            Vec::new()
        } else {
            self.twitch.live_streams(&token, &ids).await?
        };
        let mut by_user: HashMap<String, HelixStream> =
            live.into_iter().map(|s| (s.user_id.clone(), s)).collect();

        let mut rt = self.rt();
        for s in &streamers {
            if let Some(uid) = &s.twitch_user_id {
                rt.streams.insert(s.id, by_user.remove(uid));
            }
        }
        rt.last_success = Some(Utc::now());
        rt.last_error = None;
        Ok(())
    }

    /// Run detection for every channel with fresh data. Returns notifications
    /// to show; persistence happens inline.
    fn evaluate(&self, persist_all: bool) -> Vec<notify::Notice> {
        let settings = self.db.settings();
        let streamers = self.db.list_streamers().unwrap_or_default();
        let snapshots: HashMap<i64, SnapshotRow> = self
            .db
            .snapshots()
            .unwrap_or_default()
            .into_iter()
            .map(|s| (s.streamer_id, s))
            .collect();
        let now = Utc::now();
        let mut notices = Vec::new();
        let mut live_logins = BTreeSet::new();
        let mut rt = self.rt();
        let first_cycle = !rt.first_cycle_done;

        for s in &streamers {
            let Some(stream) = rt.streams.get(&s.id).cloned() else { continue };
            let prev = snapshots.get(&s.id);
            let mem = rt
                .memories
                .entry(s.id)
                .or_insert_with(|| match prev {
                    Some(p) => Memory {
                        status: p.status,
                        since: p.status_since,
                        title: p.stream_title.clone().unwrap_or_default(),
                        title_since: p.title_since,
                    },
                    None => Memory::fresh(now),
                })
                .clone();

            let title = stream.as_ref().map(|x| x.title.as_str()).unwrap_or("");
            let game = stream.as_ref().map(|x| x.game_name.as_str()).unwrap_or("");
            if stream.is_some() {
                live_logins.insert(s.login.clone());
            }
            let chat = if settings.use_chat_signals && stream.is_some() {
                self.chat.signals(&s.login)
            } else {
                ChatSignals::default()
            };
            let det = detect(
                &Observation { is_live: stream.is_some(), title, game, now, chat: &chat },
                &mem,
            );

            let changed = det.status != mem.status;
            let title_changed = title != mem.title;
            let new_mem = Memory {
                status: det.status,
                since: if changed { now } else { mem.since },
                title: title.to_string(),
                title_since: if title_changed { now } else { mem.title_since },
            };

            let snap = SnapshotRow {
                streamer_id: s.id,
                is_live: stream.is_some(),
                stream_title: stream.as_ref().map(|x| x.title.clone()),
                game_name: stream.as_ref().map(|x| x.game_name.clone()),
                mode: det.mode.clone(),
                viewer_count: stream.as_ref().map(|x| x.viewer_count),
                started_at: stream.as_ref().map(|x| x.started_at.clone()),
                status: det.status,
                confidence: det.confidence,
                signals: det.signals.clone(),
                players_needed: det.players_needed,
                status_since: new_mem.since,
                title_since: new_mem.title_since,
                last_updated: rt.last_success.unwrap_or(now),
            };

            let snapshot_differs = prev.is_none_or(|p| {
                p.status != snap.status
                    || p.stream_title != snap.stream_title
                    || p.game_name != snap.game_name
                    || p.signals != snap.signals
                    || (p.confidence - snap.confidence).abs() > 0.01
            });
            if persist_all || snapshot_differs {
                let _ = self.db.upsert_snapshot(&snap);
            }

            // The very first time we see a channel there is no real "change".
            if changed && prev.is_some() {
                let mut record = snap.clone();
                if det.status == Status::Live && mem.status == Status::Offline {
                    // Use Twitch's start time so history reads "Stream gestartet 15:42".
                    if let Some(t) = snap.started_at.as_deref().and_then(parse_time) {
                        record.status_since = t;
                    }
                }
                let _ = self.db.insert_activity(&record);

                let last_sent = rt.last_notified.get(&(s.id, det.status)).copied();
                let decision = notify::Decision {
                    settings: &settings,
                    streamer: s,
                    from: mem.status,
                    snapshot: &snap,
                    first_cycle,
                    last_sent,
                    now,
                };
                if notify::should_notify(&decision) {
                    rt.last_notified.insert((s.id, det.status), now);
                    notices.push(notify::build_notice(&settings, s, &snap));
                }
            } else if prev.is_none() && snap.is_live {
                let _ = self.db.insert_activity(&snap);
            }
            rt.memories.insert(s.id, new_mem);
        }
        rt.first_cycle_done = true;
        drop(rt);

        self.chat.set_channels(if settings.use_chat_signals {
            live_logins
        } else {
            BTreeSet::new()
        });
        notices
    }
}

pub async fn emit_state(app: &AppHandle) {
    let state = app.state::<Arc<AppState>>().inner().clone();
    let snapshot = state.snapshot_state().await;
    update_tray(app, &snapshot);
    let _ = app.emit(STATE_EVENT, snapshot);
}

fn update_tray(app: &AppHandle, state: &RadarState) {
    let Some(tray) = app.tray_by_id(crate::TRAY_ID) else { return };
    let count = |st: Status| {
        state
            .streamers
            .iter()
            .filter(|v| v.snapshot.as_ref().is_some_and(|s| s.status == st))
            .count()
    };
    let live = state
        .streamers
        .iter()
        .filter(|v| v.snapshot.as_ref().is_some_and(|s| s.is_live))
        .count();
    let searching = count(Status::Searching);
    let tip = if searching > 0 {
        format!("COD Pro Radar – {live} live · {searching} suchen vermutlich")
    } else {
        format!("COD Pro Radar – {live} live")
    };
    let _ = tray.set_tooltip(Some(tip));
}

pub async fn run(app: AppHandle) {
    let state = app.state::<Arc<AppState>>().inner().clone();
    let mut forced = true;
    loop {
        let settings = state.db.settings();
        let interval = state.effective_interval(settings.poll_interval_seconds, settings.fast_mode);
        let due = forced
            || state
                .rt()
                .last_fetch
                .is_none_or(|t| t.elapsed().as_secs() >= interval);

        let mut fetched = false;
        if due {
            state.rt().last_fetch = Some(Instant::now());
            match state.fetch(&settings.twitch_client_id).await {
                Ok(()) => fetched = true,
                Err(e) => {
                    let mut rt = state.rt();
                    rt.last_error = match e {
                        TwitchError::NotAuthenticated => None,
                        other => Some(other.to_string()),
                    };
                }
            }
        }

        // Without fresh data we keep the last known snapshot instead of
        // guessing; the UI marks it as outdated.
        let data_fresh = state.rt().last_success.is_some_and(|t| {
            (Utc::now() - t).num_seconds() < (interval as i64 * 3).max(180)
        });
        if data_fresh {
            let notices = state.evaluate(fetched);
            for n in &notices {
                notify::show(&app, &settings, n);
            }
        } else {
            state.chat.set_channels(BTreeSet::new());
        }
        emit_state(&app).await;

        forced = false;
        tokio::select! {
            _ = tokio::time::sleep(EVAL_TICK) => {}
            _ = state.wake.notified() => { forced = true; }
        }
    }
}
