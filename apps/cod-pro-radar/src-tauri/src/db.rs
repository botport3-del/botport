use crate::detector::Status;
use chrono::{DateTime, Duration, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;

pub type DbResult<T> = Result<T, rusqlite::Error>;

const SCHEMA: &str = r#"
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS streamers (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    login                 TEXT NOT NULL UNIQUE,
    display_name          TEXT NOT NULL,
    twitch_user_id        TEXT,
    profile_image_url     TEXT,
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    added_at              TEXT NOT NULL,
    profile_refreshed_at  TEXT
);

CREATE TABLE IF NOT EXISTS snapshots (
    streamer_id    INTEGER PRIMARY KEY REFERENCES streamers(id) ON DELETE CASCADE,
    is_live        INTEGER NOT NULL,
    stream_title   TEXT,
    game_name      TEXT,
    mode           TEXT,
    viewer_count   INTEGER,
    started_at     TEXT,
    status         TEXT NOT NULL,
    confidence     REAL NOT NULL,
    signals        TEXT NOT NULL DEFAULT '[]',
    players_needed INTEGER,
    status_since   TEXT NOT NULL,
    title_since    TEXT NOT NULL,
    last_updated   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    streamer_id  INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
    status       TEXT NOT NULL,
    confidence   REAL NOT NULL,
    stream_title TEXT,
    game_name    TEXT,
    mode         TEXT,
    occurred_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_streamer_time ON activity(streamer_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity(occurred_at DESC);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"#;

const ACTIVITY_RETENTION_DAYS: i64 = 30;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub twitch_client_id: String,
    pub poll_interval_seconds: u32,
    pub fast_mode: bool,
    pub use_chat_signals: bool,
    pub notify_live: bool,
    pub notify_searching: bool,
    pub notify_party_found: bool,
    pub notify_in_match: bool,
    pub notify_offline: bool,
    pub notify_min_confidence: u8,
    pub notify_cooldown_minutes: u32,
    pub notify_sound: bool,
    pub quiet_hours_enabled: bool,
    pub quiet_hours_start: String,
    pub quiet_hours_end: String,
    pub show_confidence: bool,
    pub close_to_tray: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            twitch_client_id: option_env!("COD_RADAR_TWITCH_CLIENT_ID")
                .unwrap_or_default()
                .to_string(),
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
            quiet_hours_start: "23:00".into(),
            quiet_hours_end: "08:00".into(),
            show_confidence: true,
            close_to_tray: true,
        }
    }
}

impl Settings {
    pub fn sanitized(mut self) -> Self {
        self.twitch_client_id = self.twitch_client_id.trim().to_string();
        self.poll_interval_seconds = self.poll_interval_seconds.clamp(30, 600);
        self.notify_min_confidence = self.notify_min_confidence.min(95);
        self.notify_cooldown_minutes = self.notify_cooldown_minutes.min(120);
        self
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct StreamerRow {
    pub id: i64,
    pub login: String,
    pub display_name: String,
    pub twitch_user_id: Option<String>,
    pub profile_image_url: Option<String>,
    pub notifications_enabled: bool,
    pub added_at: String,
    #[serde(skip)]
    pub profile_refreshed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SnapshotRow {
    pub streamer_id: i64,
    pub is_live: bool,
    pub stream_title: Option<String>,
    pub game_name: Option<String>,
    pub mode: Option<String>,
    pub viewer_count: Option<i64>,
    pub started_at: Option<String>,
    pub status: Status,
    pub confidence: f64,
    pub signals: Vec<String>,
    pub players_needed: Option<u8>,
    pub status_since: DateTime<Utc>,
    pub title_since: DateTime<Utc>,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActivityRow {
    pub id: i64,
    pub streamer_id: i64,
    pub login: String,
    pub display_name: String,
    pub status: Status,
    pub confidence: f64,
    pub stream_title: Option<String>,
    pub game_name: Option<String>,
    pub mode: Option<String>,
    pub occurred_at: String,
}

pub struct Db {
    conn: Mutex<Connection>,
}

fn parse_time(s: Option<String>) -> Option<DateTime<Utc>> {
    s.and_then(|v| DateTime::parse_from_rfc3339(&v).ok())
        .map(|d| d.with_timezone(&Utc))
}

impl Db {
    pub fn open(path: &Path) -> DbResult<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch(SCHEMA)?;
        let db = Db { conn: Mutex::new(conn) };
        db.prune_activity()?;
        Ok(db)
    }

    #[cfg(test)]
    pub fn open_in_memory() -> DbResult<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch(SCHEMA)?;
        Ok(Db { conn: Mutex::new(conn) })
    }

    fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn prune_activity(&self) -> DbResult<()> {
        let cutoff = (Utc::now() - Duration::days(ACTIVITY_RETENTION_DAYS)).to_rfc3339();
        self.conn()
            .execute("DELETE FROM activity WHERE occurred_at < ?1", params![cutoff])?;
        Ok(())
    }

    pub fn settings(&self) -> Settings {
        let raw: Option<String> = self
            .conn()
            .query_row("SELECT value FROM settings WHERE key = 'app'", [], |r| r.get(0))
            .optional()
            .ok()
            .flatten();
        raw.and_then(|v| serde_json::from_str::<Settings>(&v).ok())
            .unwrap_or_default()
            .sanitized()
    }

    pub fn save_settings(&self, settings: &Settings) -> DbResult<()> {
        let json = serde_json::to_string(settings).expect("settings serialize");
        self.conn().execute(
            "INSERT INTO settings(key, value) VALUES('app', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![json],
        )?;
        Ok(())
    }

    pub fn list_streamers(&self) -> DbResult<Vec<StreamerRow>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, login, display_name, twitch_user_id, profile_image_url,
                    notifications_enabled, added_at, profile_refreshed_at
             FROM streamers ORDER BY lower(display_name)",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(StreamerRow {
                id: r.get(0)?,
                login: r.get(1)?,
                display_name: r.get(2)?,
                twitch_user_id: r.get(3)?,
                profile_image_url: r.get(4)?,
                notifications_enabled: r.get::<_, i64>(5)? != 0,
                added_at: r.get(6)?,
                profile_refreshed_at: parse_time(r.get(7)?),
            })
        })?;
        rows.collect()
    }

    pub fn streamer_by_login(&self, login: &str) -> DbResult<Option<StreamerRow>> {
        Ok(self.list_streamers()?.into_iter().find(|s| s.login == login))
    }

    /// Returns `false` if the login was already present.
    pub fn insert_streamer(
        &self,
        login: &str,
        display_name: &str,
        user_id: &str,
        profile_image_url: Option<&str>,
    ) -> DbResult<bool> {
        let now = Utc::now().to_rfc3339();
        let changed = self.conn().execute(
            "INSERT OR IGNORE INTO streamers
               (login, display_name, twitch_user_id, profile_image_url, added_at, profile_refreshed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
            params![login, display_name, user_id, profile_image_url, now],
        )?;
        Ok(changed > 0)
    }

    pub fn update_profile(
        &self,
        id: i64,
        login: &str,
        display_name: &str,
        user_id: &str,
        profile_image_url: Option<&str>,
    ) -> DbResult<()> {
        self.conn().execute(
            "UPDATE streamers SET login = ?2, display_name = ?3, twitch_user_id = ?4,
                    profile_image_url = ?5, profile_refreshed_at = ?6
             WHERE id = ?1",
            params![id, login, display_name, user_id, profile_image_url, Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    pub fn delete_streamer(&self, id: i64) -> DbResult<()> {
        self.conn().execute("DELETE FROM streamers WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn set_streamer_notifications(&self, id: i64, enabled: bool) -> DbResult<()> {
        self.conn().execute(
            "UPDATE streamers SET notifications_enabled = ?2 WHERE id = ?1",
            params![id, enabled as i64],
        )?;
        Ok(())
    }

    pub fn snapshots(&self) -> DbResult<Vec<SnapshotRow>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT streamer_id, is_live, stream_title, game_name, mode, viewer_count, started_at,
                    status, confidence, signals, players_needed, status_since, title_since, last_updated
             FROM snapshots",
        )?;
        let rows = stmt.query_map([], |r| {
            let now = Utc::now();
            Ok(SnapshotRow {
                streamer_id: r.get(0)?,
                is_live: r.get::<_, i64>(1)? != 0,
                stream_title: r.get(2)?,
                game_name: r.get(3)?,
                mode: r.get(4)?,
                viewer_count: r.get(5)?,
                started_at: r.get(6)?,
                status: Status::parse(&r.get::<_, String>(7)?),
                confidence: r.get(8)?,
                signals: serde_json::from_str(&r.get::<_, String>(9)?).unwrap_or_default(),
                players_needed: r.get::<_, Option<i64>>(10)?.map(|n| n as u8),
                status_since: parse_time(r.get(11)?).unwrap_or(now),
                title_since: parse_time(r.get(12)?).unwrap_or(now),
                last_updated: parse_time(r.get(13)?).unwrap_or(now),
            })
        })?;
        rows.collect()
    }

    pub fn upsert_snapshot(&self, s: &SnapshotRow) -> DbResult<()> {
        self.conn().execute(
            "INSERT INTO snapshots (streamer_id, is_live, stream_title, game_name, mode, viewer_count,
                 started_at, status, confidence, signals, players_needed, status_since, title_since, last_updated)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT(streamer_id) DO UPDATE SET
                 is_live = excluded.is_live, stream_title = excluded.stream_title,
                 game_name = excluded.game_name, mode = excluded.mode,
                 viewer_count = excluded.viewer_count, started_at = excluded.started_at,
                 status = excluded.status, confidence = excluded.confidence,
                 signals = excluded.signals, players_needed = excluded.players_needed,
                 status_since = excluded.status_since, title_since = excluded.title_since,
                 last_updated = excluded.last_updated",
            params![
                s.streamer_id,
                s.is_live as i64,
                s.stream_title,
                s.game_name,
                s.mode,
                s.viewer_count,
                s.started_at,
                s.status.as_str(),
                s.confidence,
                serde_json::to_string(&s.signals).unwrap_or_else(|_| "[]".into()),
                s.players_needed.map(|n| n as i64),
                s.status_since.to_rfc3339(),
                s.title_since.to_rfc3339(),
                s.last_updated.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn insert_activity(&self, s: &SnapshotRow) -> DbResult<()> {
        self.conn().execute(
            "INSERT INTO activity (streamer_id, status, confidence, stream_title, game_name, mode, occurred_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                s.streamer_id,
                s.status.as_str(),
                s.confidence,
                s.stream_title,
                s.game_name,
                s.mode,
                s.status_since.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn activity(&self, streamer_id: Option<i64>, limit: u32) -> DbResult<Vec<ActivityRow>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT a.id, a.streamer_id, s.login, s.display_name, a.status, a.confidence,
                    a.stream_title, a.game_name, a.mode, a.occurred_at
             FROM activity a JOIN streamers s ON s.id = a.streamer_id
             WHERE (?1 IS NULL OR a.streamer_id = ?1)
             ORDER BY a.occurred_at DESC, a.id DESC
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![streamer_id, limit.min(1000)], |r| {
            Ok(ActivityRow {
                id: r.get(0)?,
                streamer_id: r.get(1)?,
                login: r.get(2)?,
                display_name: r.get(3)?,
                status: Status::parse(&r.get::<_, String>(4)?),
                confidence: r.get(5)?,
                stream_title: r.get(6)?,
                game_name: r.get(7)?,
                mode: r.get(8)?,
                occurred_at: r.get(9)?,
            })
        })?;
        rows.collect()
    }

    pub fn clear_activity(&self, streamer_id: Option<i64>) -> DbResult<()> {
        self.conn().execute(
            "DELETE FROM activity WHERE (?1 IS NULL OR streamer_id = ?1)",
            params![streamer_id],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn streamer_snapshot_activity_roundtrip() {
        let db = Db::open_in_memory().unwrap();
        assert!(db.insert_streamer("pirate", "Pirate", "123", None).unwrap());
        assert!(!db.insert_streamer("pirate", "Pirate", "123", None).unwrap());
        let s = db.streamer_by_login("pirate").unwrap().unwrap();
        let now = Utc::now();
        let snap = SnapshotRow {
            streamer_id: s.id,
            is_live: true,
            stream_title: Some("LF1".into()),
            game_name: Some("Call of Duty: Warzone".into()),
            mode: Some("Ranked".into()),
            viewer_count: Some(1000),
            started_at: None,
            status: Status::Searching,
            confidence: 0.8,
            signals: vec!["title:lf-n".into()],
            players_needed: Some(1),
            status_since: now,
            title_since: now,
            last_updated: now,
        };
        db.upsert_snapshot(&snap).unwrap();
        db.insert_activity(&snap).unwrap();
        let snaps = db.snapshots().unwrap();
        assert_eq!(snaps[0].status, Status::Searching);
        assert_eq!(snaps[0].players_needed, Some(1));
        assert_eq!(db.activity(Some(s.id), 10).unwrap().len(), 1);
        db.delete_streamer(s.id).unwrap();
        assert!(db.activity(None, 10).unwrap().is_empty());
    }

    #[test]
    fn settings_default_and_clamp() {
        let db = Db::open_in_memory().unwrap();
        let mut s = db.settings();
        assert_eq!(s.poll_interval_seconds, 60);
        s.poll_interval_seconds = 1;
        db.save_settings(&s.sanitized()).unwrap();
        assert_eq!(db.settings().poll_interval_seconds, 30);
    }
}
