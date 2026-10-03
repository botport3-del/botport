mod chat;
mod db;
mod detector;
mod monitor;
mod notify;
mod twitch;

use db::{ActivityRow, Db, Settings};
use monitor::{AppState, RadarState};
use serde::Serialize;
use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_opener::OpenerExt;
use twitch::{normalize_login, DevicePoll, TwitchError};

pub const TRAY_ID: &str = "main-tray";
const AUTH_EVENT: &str = "radar://auth";
const TWITCH_CONSOLE_URL: &str = "https://dev.twitch.tv/console/apps";

type AppSt<'a> = State<'a, Arc<AppState>>;

#[derive(Default)]
struct PendingAuth {
    verification_uri: Mutex<Option<String>>,
    generation: AtomicU64,
}

pub(crate) fn open_url(app: &AppHandle, url: &str) {
    if let Err(e) = app.opener().open_url(url, None::<&str>) {
        eprintln!("[open] {url}: {e}");
    }
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

async fn changed(app: &AppHandle, state: &AppState) {
    state.wake.notify_one();
    monitor::emit_state(app).await;
}

#[tauri::command]
async fn get_state(state: AppSt<'_>) -> Result<RadarState, String> {
    Ok(state.snapshot_state().await)
}

#[derive(Serialize)]
struct AddResult {
    added: Vec<String>,
    already: Vec<String>,
    not_found: Vec<String>,
    invalid: Vec<String>,
}

#[tauri::command]
async fn add_streamers(app: AppHandle, state: AppSt<'_>, input: String) -> Result<AddResult, String> {
    let mut result = AddResult { added: vec![], already: vec![], not_found: vec![], invalid: vec![] };
    let mut seen = HashSet::new();
    let mut logins = Vec::new();
    for raw in input.split([',', ';', '\n', ' ', '\t']).filter(|s| !s.trim().is_empty()) {
        match normalize_login(raw) {
            Some(l) if seen.insert(l.clone()) => {
                if state.db.streamer_by_login(&l).map_err(err)?.is_some() {
                    result.already.push(l);
                } else {
                    logins.push(l);
                }
            }
            Some(_) => {}
            None => result.invalid.push(raw.trim().to_string()),
        }
    }
    if logins.is_empty() {
        return Ok(result);
    }
    let settings = state.db.settings();
    let token = state.twitch.ensure_token(&settings.twitch_client_id).await.map_err(err)?;
    let users = state.twitch.users_by_login(&token, &logins).await.map_err(err)?;
    for login in logins {
        match users.iter().find(|u| u.login == login) {
            Some(u) => {
                state
                    .db
                    .insert_streamer(&u.login, &u.display_name, &u.id, Some(&u.profile_image_url))
                    .map_err(err)?;
                result.added.push(u.display_name.clone());
            }
            None => result.not_found.push(login),
        }
    }
    changed(&app, &state).await;
    Ok(result)
}

#[tauri::command]
async fn remove_streamer(app: AppHandle, state: AppSt<'_>, id: i64) -> Result<(), String> {
    state.db.delete_streamer(id).map_err(err)?;
    state.forget_streamer(id);
    changed(&app, &state).await;
    Ok(())
}

#[tauri::command]
async fn set_streamer_notifications(app: AppHandle, state: AppSt<'_>, id: i64, enabled: bool) -> Result<(), String> {
    state.db.set_streamer_notifications(id, enabled).map_err(err)?;
    monitor::emit_state(&app).await;
    Ok(())
}

#[tauri::command]
fn get_activity(state: AppSt<'_>, streamer_id: Option<i64>, limit: Option<u32>) -> Result<Vec<ActivityRow>, String> {
    state.db.activity(streamer_id, limit.unwrap_or(200)).map_err(err)
}

#[tauri::command]
fn clear_activity(state: AppSt<'_>, streamer_id: Option<i64>) -> Result<(), String> {
    state.db.clear_activity(streamer_id).map_err(err)
}

#[tauri::command]
fn get_settings(state: AppSt<'_>) -> Settings {
    state.db.settings()
}

#[tauri::command]
async fn save_settings(app: AppHandle, state: AppSt<'_>, settings: Settings) -> Result<Settings, String> {
    let settings = settings.sanitized();
    state.db.save_settings(&settings).map_err(err)?;
    changed(&app, &state).await;
    Ok(settings)
}

#[derive(Serialize)]
struct DeviceStart {
    user_code: String,
    verification_uri: String,
    expires_in: i64,
}

#[derive(Serialize, Clone)]
struct AuthEvent {
    status: &'static str,
    message: Option<String>,
}

#[tauri::command]
async fn auth_start(
    app: AppHandle,
    state: AppSt<'_>,
    pending: State<'_, PendingAuth>,
) -> Result<DeviceStart, String> {
    let client_id = state.db.settings().twitch_client_id;
    let code = state.twitch.start_device_flow(&client_id).await.map_err(err)?;
    *pending.verification_uri.lock().unwrap_or_else(|e| e.into_inner()) = Some(code.verification_uri.clone());
    let generation = pending.generation.fetch_add(1, Ordering::SeqCst) + 1;

    let st = state.inner().clone();
    let handle = app.clone();
    let device_code = code.device_code.clone();
    let expires = code.expires_in;
    let mut interval = code.interval.max(1);
    tauri::async_runtime::spawn(async move {
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(expires.max(0) as u64);
        let emit = |status: &'static str, message: Option<String>| {
            let _ = handle.emit(AUTH_EVENT, AuthEvent { status, message });
        };
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(interval)).await;
            let current = handle.state::<PendingAuth>().generation.load(Ordering::SeqCst);
            if current != generation {
                return;
            }
            if std::time::Instant::now() > deadline {
                emit("expired", None);
                return;
            }
            match st.twitch.poll_device_flow(&client_id, &device_code).await {
                Ok(DevicePoll::Pending) => {}
                Ok(DevicePoll::SlowDown) => interval += 5,
                Ok(DevicePoll::Done(t)) => {
                    emit("success", Some(t.login));
                    changed(&handle, &st).await;
                    return;
                }
                Ok(DevicePoll::Expired) => {
                    emit("expired", None);
                    return;
                }
                Ok(DevicePoll::Denied) => {
                    emit("denied", None);
                    return;
                }
                Err(e) => {
                    emit("error", Some(e.to_string()));
                    return;
                }
            }
        }
    });

    Ok(DeviceStart {
        user_code: code.user_code,
        verification_uri: code.verification_uri,
        expires_in: code.expires_in,
    })
}

#[tauri::command]
fn auth_cancel(pending: State<'_, PendingAuth>) {
    pending.generation.fetch_add(1, Ordering::SeqCst);
}

#[tauri::command]
async fn auth_logout(app: AppHandle, state: AppSt<'_>) -> Result<(), String> {
    state.twitch.logout().await;
    monitor::emit_state(&app).await;
    Ok(())
}

#[tauri::command]
fn open_stream(app: AppHandle, login: String) -> Result<(), String> {
    let login = normalize_login(&login).ok_or("Ungültiger Kanalname")?;
    open_url(&app, &notify::stream_url(&login));
    Ok(())
}

#[tauri::command]
fn open_verification(app: AppHandle, pending: State<'_, PendingAuth>) -> Result<(), String> {
    let uri = pending
        .verification_uri
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone()
        .ok_or("Keine Anmeldung aktiv")?;
    if !uri.starts_with("https://www.twitch.tv/") && !uri.starts_with("https://id.twitch.tv/") {
        return Err("Unerwartete Anmelde-URL".into());
    }
    open_url(&app, &uri);
    Ok(())
}

#[tauri::command]
fn open_twitch_console(app: AppHandle) {
    open_url(&app, TWITCH_CONSOLE_URL);
}

#[tauri::command]
fn refresh_now(state: AppSt<'_>) {
    state.wake.notify_one();
}

#[derive(Serialize)]
struct Suggestion {
    login: String,
    display_name: String,
    game_name: String,
    title: String,
    viewer_count: i64,
}

#[tauri::command]
async fn suggest_followed(state: AppSt<'_>) -> Result<Vec<Suggestion>, String> {
    let settings = state.db.settings();
    let token = state.twitch.ensure_token(&settings.twitch_client_id).await.map_err(err)?;
    let known: HashSet<String> = state
        .db
        .list_streamers()
        .map_err(err)?
        .into_iter()
        .map(|s| s.login)
        .collect();
    let streams = match state.twitch.followed_live_streams(&token).await {
        Ok(s) => s,
        Err(TwitchError::Api(401, _)) | Err(TwitchError::Unauthorized) => {
            return Err("Bitte neu mit Twitch verbinden, um gefolgte Kanäle zu sehen.".into())
        }
        Err(e) => return Err(err(e)),
    };
    let mut out: Vec<Suggestion> = streams
        .into_iter()
        .filter(|s| detector::is_cod_game(&s.game_name) && !known.contains(&s.user_login))
        .map(|s| Suggestion {
            login: s.user_login,
            display_name: s.user_name,
            game_name: s.game_name,
            title: s.title,
            viewer_count: s.viewer_count,
        })
        .collect();
    out.sort_by_key(|s| std::cmp::Reverse(s.viewer_count));
    Ok(out)
}

#[tauri::command]
fn test_notification(app: AppHandle, state: AppSt<'_>) {
    let settings = state.db.settings();
    notify::show(
        &app,
        &settings,
        &notify::Notice {
            title: "🟡 Test: Pirate sucht vermutlich gerade einen Spieler.".into(),
            body: "Warzone Ranked · Twitch · Confidence 87 %".into(),
            login: "pirate".into(),
        },
    );
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Radar öffnen", true, None::<&str>)?;
    let refresh = MenuItem::with_id(app, "refresh", "Jetzt aktualisieren", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Beenden", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&open, &refresh, &sep, &quit])?;
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("COD Pro Radar")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "refresh" => app.state::<Arc<AppState>>().wake.notify_one(),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let db = Db::open(&dir.join("radar.sqlite3"))?;
            app.manage(Arc::new(AppState::new(db)));
            app.manage(PendingAuth::default());
            if let Err(e) = build_tray(app.handle()) {
                eprintln!("[tray] Infobereich-Symbol nicht verfügbar: {e}");
            }
            tauri::async_runtime::spawn(monitor::run(app.handle().clone()));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let to_tray = window.state::<Arc<AppState>>().db.settings().close_to_tray;
                if to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            add_streamers,
            remove_streamer,
            set_streamer_notifications,
            get_activity,
            clear_activity,
            get_settings,
            save_settings,
            auth_start,
            auth_cancel,
            auth_logout,
            open_stream,
            open_verification,
            open_twitch_console,
            refresh_now,
            suggest_followed,
            test_notification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running COD Pro Radar");
}
