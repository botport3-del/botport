//! Read-only, anonymous connection to Twitch chat (official IRC-over-WebSocket
//! interface). Only aggregated, time-decayed signals are kept in memory; chat
//! messages themselves are never stored.

use crate::detector::{
    extract_needed, is_viewer_join_request, score_phrases, ChatSignals, MATCH_PHRASES,
    PARTY_PHRASES, SEARCH_PHRASES,
};
use futures_util::{SinkExt, StreamExt};
use std::collections::{BTreeSet, HashMap};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::watch;
use tokio_tungstenite::tungstenite::Message;

const CHAT_URL: &str = "wss://irc-ws.chat.twitch.tv:443";
const SIGNAL_TTL: Duration = Duration::from_secs(10 * 60);
const HALF_LIFE_SECS: f64 = 180.0;
const JOIN_REQUEST_WINDOW: Duration = Duration::from_secs(3 * 60);
const JOINS_PER_BATCH: usize = 15;
const JOIN_BATCH_INTERVAL: Duration = Duration::from_secs(11);
const READ_TIMEOUT: Duration = Duration::from_secs(6 * 60);
const MAX_EVENTS_PER_CHANNEL: usize = 200;

// Chat bots usually carry a moderator badge and repeat timed messages, so their
// "join the discord" spam must not count as the streamer speaking.
const IGNORED_BOTS: &[&str] = &[
    "nightbot", "streamelements", "streamlabs", "moobot", "fossabot", "wizebot", "sery_bot",
    "botrixoficial", "soundalerts", "kofistreambot",
];

#[derive(Clone, Copy, PartialEq)]
enum Role {
    Broadcaster,
    Moderator,
    Viewer,
}

#[derive(Clone)]
enum Kind {
    Search,
    Party,
    Match,
    JoinRequest,
}

#[derive(Clone)]
struct Event {
    at: Instant,
    kind: Kind,
    weight: f64,
    key: String,
    needed: Option<u8>,
}

type Buffers = Arc<Mutex<HashMap<String, Vec<Event>>>>;

pub struct ChatHub {
    buffers: Buffers,
    desired: watch::Sender<BTreeSet<String>>,
    connected: Arc<AtomicBool>,
}

impl ChatHub {
    pub fn start() -> Self {
        let buffers: Buffers = Arc::default();
        let connected = Arc::new(AtomicBool::new(false));
        let (tx, rx) = watch::channel(BTreeSet::new());
        tauri::async_runtime::spawn(run(buffers.clone(), connected.clone(), rx));
        ChatHub { buffers, desired: tx, connected }
    }

    pub fn set_channels(&self, logins: BTreeSet<String>) {
        if let Ok(mut b) = self.buffers.lock() {
            b.retain(|k, _| logins.contains(k));
        }
        self.desired.send_if_modified(|cur| {
            if *cur == logins {
                false
            } else {
                *cur = logins;
                true
            }
        });
    }

    pub fn is_connected(&self) -> bool {
        self.connected.load(Ordering::Relaxed)
    }

    pub fn signals(&self, login: &str) -> ChatSignals {
        let Ok(mut buffers) = self.buffers.lock() else {
            return ChatSignals::default();
        };
        let Some(events) = buffers.get_mut(login) else {
            return ChatSignals::default();
        };
        events.retain(|e| e.at.elapsed() < SIGNAL_TTL);
        aggregate(events)
    }
}

fn decay(e: &Event) -> f64 {
    0.5f64.powf(e.at.elapsed().as_secs_f64() / HALF_LIFE_SECS)
}

fn aggregate(events: &[Event]) -> ChatSignals {
    let mut out = ChatSignals::default();
    let mut keys = BTreeSet::new();
    let mut join_requests = 0usize;
    let combine = |a: f64, b: f64| 1.0 - (1.0 - a) * (1.0 - b);
    for e in events {
        let w = e.weight * decay(e);
        match e.kind {
            Kind::Search => {
                out.search = combine(out.search, w);
                out.needed = e.needed.or(out.needed);
            }
            Kind::Party => out.party = combine(out.party, w),
            Kind::Match => out.in_match = combine(out.in_match, w),
            Kind::JoinRequest => {
                if e.at.elapsed() < JOIN_REQUEST_WINDOW {
                    join_requests += 1;
                }
                continue;
            }
        }
        keys.insert(e.key.clone());
    }
    // A handful of "inv me" messages is a weak hint that the streamer asked for
    // players; it can support other evidence but never trigger SEARCHING alone.
    if join_requests >= 2 {
        out.search = combine(out.search, (0.07 * join_requests as f64).min(0.3));
        keys.insert("chat:viewers:join-requests".into());
    }
    out.keys = keys.into_iter().collect();
    out
}

struct PrivMsg<'a> {
    channel: &'a str,
    role: Role,
    user: &'a str,
    text: &'a str,
}

fn parse_privmsg(line: &str) -> Option<PrivMsg<'_>> {
    let (tags, rest) = match line.strip_prefix('@') {
        Some(l) => l.split_once(' ')?,
        None => ("", line),
    };
    let rest = rest.strip_prefix(':')?;
    let (prefix, rest) = rest.split_once(' ')?;
    let user = prefix.split('!').next()?;
    let rest = rest.strip_prefix("PRIVMSG #")?;
    let (channel, text) = rest.split_once(" :")?;
    let mut role = Role::Viewer;
    for tag in tags.split(';') {
        if let Some(badges) = tag.strip_prefix("badges=") {
            if badges.contains("broadcaster/") {
                role = Role::Broadcaster;
            }
        } else if tag == "mod=1" && role == Role::Viewer {
            role = Role::Moderator;
        }
    }
    if user == channel {
        role = Role::Broadcaster;
    }
    Some(PrivMsg { channel, role, user, text })
}

fn events_for(msg: &PrivMsg) -> Vec<Event> {
    let now = Instant::now();
    if msg.role == Role::Viewer {
        if is_viewer_join_request(msg.text) {
            return vec![Event {
                at: now,
                kind: Kind::JoinRequest,
                weight: 0.0,
                key: String::new(),
                needed: None,
            }];
        }
        return vec![];
    }
    if IGNORED_BOTS.contains(&msg.user) {
        return vec![];
    }
    let (factor, who) = match msg.role {
        Role::Broadcaster => (1.0, "broadcaster"),
        _ => (0.75, "mod"),
    };
    let mut out = Vec::new();
    for (kind, list) in [
        (Kind::Search, &*SEARCH_PHRASES),
        (Kind::Party, &*PARTY_PHRASES),
        (Kind::Match, &*MATCH_PHRASES),
    ] {
        let mut keys = Vec::new();
        let score = score_phrases(msg.text, list, &format!("chat:{who}"), &mut keys);
        if score > 0.0 {
            out.push(Event {
                at: now,
                needed: matches!(kind, Kind::Search).then(|| extract_needed(msg.text)).flatten(),
                kind,
                weight: score * factor,
                key: keys.join("+"),
            });
        }
    }
    out
}

fn anon_nick() -> String {
    let n = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    format!("justinfan{}", 10000 + n % 89999)
}

async fn run(buffers: Buffers, connected: Arc<AtomicBool>, mut desired: watch::Receiver<BTreeSet<String>>) {
    let mut backoff = 2u64;
    loop {
        if desired.borrow().is_empty() {
            if desired.changed().await.is_err() {
                return;
            }
            continue;
        }
        match tokio_tungstenite::connect_async(CHAT_URL).await {
            Ok((ws, _)) => {
                backoff = 2;
                connected.store(true, Ordering::Relaxed);
                if let Err(e) = session(ws, &buffers, &mut desired).await {
                    eprintln!("[chat] Verbindung beendet: {e}");
                }
                connected.store(false, Ordering::Relaxed);
            }
            Err(e) => eprintln!("[chat] Verbindung fehlgeschlagen: {e}"),
        }
        tokio::time::sleep(Duration::from_secs(backoff)).await;
        backoff = (backoff * 2).min(60);
    }
}

async fn session<S>(
    ws: tokio_tungstenite::WebSocketStream<S>,
    buffers: &Buffers,
    desired: &mut watch::Receiver<BTreeSet<String>>,
) -> Result<(), String>
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin,
{
    let (mut tx, mut rx) = ws.split();
    for line in [
        "CAP REQ :twitch.tv/tags".to_string(),
        "PASS SCHMOOPIIE".to_string(),
        format!("NICK {}", anon_nick()),
    ] {
        tx.send(Message::Text(line)).await.map_err(|e| e.to_string())?;
    }

    let mut joined: BTreeSet<String> = BTreeSet::new();
    let mut join_tick = tokio::time::interval(JOIN_BATCH_INTERVAL);

    loop {
        tokio::select! {
            msg = tokio::time::timeout(READ_TIMEOUT, rx.next()) => {
                let msg = match msg {
                    Err(_) => return Err("Zeitüberschreitung".into()),
                    Ok(None) => return Err("geschlossen".into()),
                    Ok(Some(Err(e))) => return Err(e.to_string()),
                    Ok(Some(Ok(m))) => m,
                };
                let Message::Text(text) = msg else { continue };
                for line in text.lines() {
                    if let Some(payload) = line.strip_prefix("PING") {
                        tx.send(Message::Text(format!("PONG{payload}")))
                            .await
                            .map_err(|e| e.to_string())?;
                    } else if line.contains(" RECONNECT") {
                        return Err("Server verlangt Reconnect".into());
                    } else if let Some(pm) = parse_privmsg(line) {
                        let events = events_for(&pm);
                        if !events.is_empty() {
                            if let Ok(mut b) = buffers.lock() {
                                let buf = b.entry(pm.channel.to_string()).or_default();
                                buf.extend(events);
                                if buf.len() > MAX_EVENTS_PER_CHANNEL {
                                    let excess = buf.len() - MAX_EVENTS_PER_CHANNEL;
                                    buf.drain(..excess);
                                }
                            }
                        }
                    }
                }
            }
            changed = desired.changed() => {
                if changed.is_err() {
                    return Ok(());
                }
                let want = desired.borrow().clone();
                let leave: Vec<String> = joined.difference(&want).cloned().collect();
                if !leave.is_empty() {
                    let list = leave.iter().map(|c| format!("#{c}")).collect::<Vec<_>>().join(",");
                    tx.send(Message::Text(format!("PART {list}"))).await.map_err(|e| e.to_string())?;
                    for c in leave {
                        joined.remove(&c);
                    }
                }
                if want.is_empty() {
                    return Ok(());
                }
            }
            _ = join_tick.tick() => {
                // Joins are rate-limited by Twitch, so they go out in small batches.
                let want = desired.borrow().clone();
                let batch: Vec<String> = want.difference(&joined).take(JOINS_PER_BATCH).cloned().collect();
                if !batch.is_empty() {
                    let list = batch.iter().map(|c| format!("#{c}")).collect::<Vec<_>>().join(",");
                    tx.send(Message::Text(format!("JOIN {list}"))).await.map_err(|e| e.to_string())?;
                    joined.extend(batch);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_broadcaster_message() {
        let line = "@badge-info=;badges=broadcaster/1;mod=0 :pirate!pirate@pirate.tmi.twitch.tv PRIVMSG #pirate :need 1 for ranked";
        let pm = parse_privmsg(line).unwrap();
        assert!(pm.role == Role::Broadcaster);
        let ev = events_for(&pm);
        assert_eq!(ev.len(), 1);
        let sig = aggregate(&ev);
        assert!(sig.search >= 0.5);
        assert_eq!(sig.needed, Some(1));
    }

    #[test]
    fn viewer_need_messages_are_ignored_but_join_requests_count() {
        let viewer = "@badges=;mod=0 :fan!fan@fan.tmi.twitch.tv PRIVMSG #pirate :need 1 lol";
        assert!(events_for(&parse_privmsg(viewer).unwrap()).is_empty());
        let req = "@badges=;mod=0 :fan!fan@fan.tmi.twitch.tv PRIVMSG #pirate :inv me pls";
        let ev: Vec<Event> = (0..3).flat_map(|_| events_for(&parse_privmsg(req).unwrap())).collect();
        let sig = aggregate(&ev);
        assert!(sig.search > 0.0 && sig.search < 0.5);
    }

    #[test]
    fn bots_are_ignored() {
        let line = "@badges=moderator/1;mod=1 :nightbot!nightbot@nightbot.tmi.twitch.tv PRIVMSG #pirate :LF1? join the discord";
        assert!(events_for(&parse_privmsg(line).unwrap()).is_empty());
    }
}
