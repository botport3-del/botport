use crate::db::{Settings, SnapshotRow, StreamerRow};
use crate::detector::Status;
use chrono::{DateTime, Local, NaiveTime, Utc};
use tauri::AppHandle;

pub struct Notice {
    pub title: String,
    pub body: String,
    #[cfg_attr(not(windows), allow(dead_code))]
    pub login: String,
}

pub fn stream_url(login: &str) -> String {
    format!("https://www.twitch.tv/{login}")
}

fn in_quiet_hours(settings: &Settings, now: NaiveTime) -> bool {
    if !settings.quiet_hours_enabled {
        return false;
    }
    let parse = |s: &str| NaiveTime::parse_from_str(s, "%H:%M").ok();
    let (Some(start), Some(end)) = (parse(&settings.quiet_hours_start), parse(&settings.quiet_hours_end)) else {
        return false;
    };
    if start <= end {
        now >= start && now < end
    } else {
        now >= start || now < end
    }
}

pub struct Decision<'a> {
    pub settings: &'a Settings,
    pub streamer: &'a StreamerRow,
    pub from: Status,
    pub snapshot: &'a SnapshotRow,
    /// First evaluation after app start: suppress live/offline noise from
    /// channels that changed while the app was closed.
    pub first_cycle: bool,
    pub last_sent: Option<DateTime<Utc>>,
    pub now: DateTime<Utc>,
}

pub fn should_notify(d: &Decision) -> bool {
    let s = d.settings;
    if !d.streamer.notifications_enabled {
        return false;
    }
    let conf_ok = d.snapshot.confidence * 100.0 >= f64::from(s.notify_min_confidence);
    let enabled = match d.snapshot.status {
        Status::Searching => s.notify_searching && conf_ok,
        Status::PartyFound => s.notify_party_found && conf_ok && d.from == Status::Searching,
        Status::InMatch => s.notify_in_match && conf_ok,
        Status::Live => s.notify_live && d.from == Status::Offline && !d.first_cycle,
        Status::Offline => s.notify_offline && !d.first_cycle,
        Status::Unknown => false,
    };
    if !enabled || in_quiet_hours(s, Local::now().time()) {
        return false;
    }
    let cooldown = chrono::Duration::minutes(i64::from(s.notify_cooldown_minutes));
    d.last_sent.is_none_or(|t| d.now - t >= cooldown)
}

pub fn short_game(game: &str) -> String {
    game.strip_prefix("Call of Duty: ")
        .unwrap_or(game)
        .to_string()
}

pub fn build_notice(settings: &Settings, streamer: &StreamerRow, snap: &SnapshotRow) -> Notice {
    let name = &streamer.display_name;
    let title = match snap.status {
        Status::Searching => match snap.players_needed {
            Some(1) => format!("🟡 {name} sucht vermutlich gerade einen Spieler."),
            Some(n) => format!("🟡 {name} sucht vermutlich gerade {n} Spieler."),
            None => format!("🟡 {name} sucht vermutlich gerade Mitspieler."),
        },
        Status::PartyFound => format!("🟢 {name} hat vermutlich eine Party gefunden."),
        Status::InMatch => format!("🔵 {name} ist vermutlich jetzt im Match."),
        Status::Live => format!("🔴 {name} ist jetzt live."),
        Status::Offline => format!("⚪ {name} ist jetzt offline."),
        Status::Unknown => format!("⚫ {name}: Status unklar."),
    };
    let mut parts: Vec<String> = Vec::new();
    let game = snap.game_name.as_deref().map(short_game).unwrap_or_default();
    match (game.is_empty(), snap.mode.as_deref()) {
        (false, Some(m)) => parts.push(format!("{game} {m}")),
        (false, None) => parts.push(game),
        (true, Some(m)) => parts.push(m.to_string()),
        (true, None) => {}
    }
    parts.push("Twitch".into());
    let estimated = matches!(snap.status, Status::Searching | Status::PartyFound | Status::InMatch);
    if settings.show_confidence && estimated {
        parts.push(format!("Confidence {:.0} %", snap.confidence * 100.0));
    }
    Notice {
        title,
        body: parts.join(" · "),
        login: streamer.login.clone(),
    }
}

#[cfg(windows)]
pub fn show(app: &AppHandle, settings: &Settings, n: &Notice) {
    use tauri::Manager;
    use tauri_winrt_notification::{Sound, Toast};

    // Installed builds register the bundle identifier as the AppUserModelID on
    // the Start-menu shortcut; dev builds borrow PowerShell's so toasts appear.
    let app_id = if tauri::is_dev() {
        Toast::POWERSHELL_APP_ID.to_string()
    } else {
        app.config().identifier.clone()
    };
    let url = stream_url(&n.login);
    let handle = app.clone();
    let result = Toast::new(&app_id)
        .title(&n.title)
        .text1(&n.body)
        .sound(settings.notify_sound.then_some(Sound::Default))
        .add_button("Stream öffnen", "open")
        .on_activated(move |action| {
            if action.as_deref() == Some("open") {
                crate::open_url(&handle, &url);
            } else if let Some(w) = handle.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
            Ok(())
        })
        .show();
    if let Err(e) = result {
        eprintln!("[notify] Toast fehlgeschlagen: {e}");
    }
}

#[cfg(not(windows))]
pub fn show(app: &AppHandle, settings: &Settings, n: &Notice) {
    use tauri_plugin_notification::NotificationExt;
    let mut builder = app.notification().builder().title(&n.title).body(&n.body);
    if settings.notify_sound {
        builder = builder.sound("default");
    }
    if let Err(e) = builder.show() {
        eprintln!("[notify] Benachrichtigung fehlgeschlagen: {e}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn streamer() -> StreamerRow {
        StreamerRow {
            id: 1,
            login: "pirate".into(),
            display_name: "Pirate".into(),
            twitch_user_id: Some("1".into()),
            profile_image_url: None,
            notifications_enabled: true,
            added_at: String::new(),
            profile_refreshed_at: None,
        }
    }

    fn snap(status: Status, confidence: f64) -> SnapshotRow {
        let now = Utc::now();
        SnapshotRow {
            streamer_id: 1,
            is_live: true,
            stream_title: None,
            game_name: Some("Call of Duty: Warzone".into()),
            mode: Some("Ranked".into()),
            viewer_count: None,
            started_at: None,
            status,
            confidence,
            signals: vec![],
            players_needed: Some(1),
            status_since: now,
            title_since: now,
            last_updated: now,
        }
    }

    #[test]
    fn notifies_on_search_and_respects_confidence_and_cooldown() {
        let settings = Settings::default();
        let st = streamer();
        let now = Utc::now();
        let good = snap(Status::Searching, 0.8);
        let base = Decision {
            settings: &settings,
            streamer: &st,
            from: Status::Live,
            snapshot: &good,
            first_cycle: false,
            last_sent: None,
            now,
        };
        assert!(should_notify(&base));
        let weak = snap(Status::Searching, 0.4);
        assert!(!should_notify(&Decision { snapshot: &weak, ..base }));
        let recent = Decision { last_sent: Some(now - chrono::Duration::seconds(30)), ..base };
        assert!(!should_notify(&recent));
    }

    #[test]
    fn notice_text_is_hedged() {
        let n = build_notice(&Settings::default(), &streamer(), &snap(Status::Searching, 0.87));
        assert!(n.title.contains("vermutlich"));
        assert_eq!(n.body, "Warzone Ranked · Twitch · Confidence 87 %");
    }

    #[test]
    fn quiet_hours_wrap_midnight() {
        let s = Settings { quiet_hours_enabled: true, ..Settings::default() };
        let t = |h| NaiveTime::from_hms_opt(h, 0, 0).unwrap();
        assert!(in_quiet_hours(&s, t(23)));
        assert!(in_quiet_hours(&s, t(3)));
        assert!(!in_quiet_hours(&s, t(12)));
    }
}
