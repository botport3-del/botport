use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Status {
    Offline,
    Live,
    Searching,
    PartyFound,
    InMatch,
    Unknown,
}

impl Status {
    pub fn as_str(self) -> &'static str {
        match self {
            Status::Offline => "OFFLINE",
            Status::Live => "LIVE",
            Status::Searching => "SEARCHING",
            Status::PartyFound => "PARTY_FOUND",
            Status::InMatch => "IN_MATCH",
            Status::Unknown => "UNKNOWN",
        }
    }

    pub fn parse(s: &str) -> Status {
        match s {
            "LIVE" => Status::Live,
            "SEARCHING" => Status::Searching,
            "PARTY_FOUND" => Status::PartyFound,
            "IN_MATCH" => Status::InMatch,
            "UNKNOWN" => Status::Unknown,
            _ => Status::Offline,
        }
    }
}

pub struct Phrase {
    re: Regex,
    weight: f64,
    key: &'static str,
}

fn phrases(list: &[(&str, f64, &'static str)]) -> Vec<Phrase> {
    list.iter()
        .map(|(re, weight, key)| Phrase {
            re: Regex::new(&format!("(?i){re}")).expect("valid phrase regex"),
            weight: *weight,
            key,
        })
        .collect()
}

pub static SEARCH_PHRASES: LazyLock<Vec<Phrase>> = LazyLock::new(|| {
    phrases(&[
        (r"\blfg\b", 0.45, "lfg"),
        (r"\blf\s?[1-3]\b", 0.6, "lf-n"),
        (r"\bneed\s?[1-3]\b", 0.6, "need-n"),
        (r"\bneed\s?(?:one|two|three)\b", 0.55, "need-word"),
        (r"\bneed(?:ing)?\s?(?:a\s)?(?:teammates?|mates?|players?|a\s?(?:4th|3rd|fourth|third))\b", 0.6, "need-teammate"),
        (r"\blooking\s?for\s?(?:[1-3]|one|two|a\s?(?:teammate|player|4th|3rd)|teammates?|players?|squad)\b", 0.6, "looking-for"),
        (r"\blooking\s?for\b", 0.35, "looking-for-generic"),
        (r"\bsearching\b", 0.3, "searching"),
        (r"\banyone\s?(?:wanna|want\sto|tryna)?\s?(?:play|join|hop\son)\b", 0.45, "anyone-join"),
        (r"\b(?:join|hop\s?in)\s?(?:me|us|up)\b", 0.35, "join"),
        (r"\bviewer\s?(?:games?|lobb(?:y|ies))\b", 0.3, "viewer-games"),
        (r"\bsuche\s?(?:noch\s?)?(?:einen|eine|1|2|3|zwei|drei|mitspieler|teammates?|leute)\b", 0.6, "suche"),
        (r"\bbrauche\s?(?:noch\s?)?(?:einen|eine|1|2|3|zwei|drei|mitspieler|leute)\b", 0.6, "brauche"),
        (r"\b(?:mitspieler|teammates?|spieler)\s?gesucht\b", 0.6, "gesucht"),
        (r"\bwer\s?(?:will|möchte|hat\s?bock)\s?mit\b", 0.45, "wer-will-mit"),
    ])
});

pub static PARTY_PHRASES: LazyLock<Vec<Phrase>> = LazyLock::new(|| {
    phrases(&[
        (r"\b(?:full|filled)\s?(?:squad|team|lobby|party)\b", 0.55, "full-squad"),
        (r"\b(?:squad|team|party)\s?(?:is\s)?(?:full|filled|set)\b", 0.55, "squad-full"),
        (r"\bgot\s?(?:one|him|someone|a\s?(?:4th|3rd|teammate))\b", 0.5, "got-one"),
        (r"\bfound\s?(?:one|someone|a\s?(?:4th|3rd|teammate))\b", 0.5, "found-one"),
        (r"\bwe(?:'re|\sare)\s?(?:full|good|set)\b", 0.45, "we-are-full"),
        (r"\bwir\s?sind\s?(?:voll|komplett)\b", 0.55, "wir-sind-voll"),
        (r"\b(?:haben|hab)\s?(?:einen|jemanden)\s?(?:gefunden)?\b", 0.4, "haben-einen"),
        (r"\b(?:team|squad)\s?(?:ist\s)?(?:voll|komplett)\b", 0.55, "team-voll"),
    ])
});

pub static MATCH_PHRASES: LazyLock<Vec<Phrase>> = LazyLock::new(|| {
    phrases(&[
        (r"\bin\s?(?:a\s)?(?:match|game)\b", 0.45, "in-match"),
        (r"\b(?:dropping|we(?:'re|\sare)\s?in|droppen)\b", 0.4, "dropping"),
        (r"\bkill\s?race\b", 0.35, "kill-race"),
        (r"\b(?:tournament|turnier|wsow|wager)\b", 0.3, "tournament"),
    ])
});

static VIEWER_JOIN_REQUEST: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(?:inv(?:ite)?\s?me|add\s?me|can\s?i\s?(?:join|play|hop)|kann\s?ich\s?mit(?:spielen|zocken)?|nimm\s?mich)\b")
        .expect("valid regex")
});

static NEEDED_COUNT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(?:lf|need|looking\s?for|suche\s?(?:noch\s?)?|brauche\s?(?:noch\s?)?)\s?([1-3]|one|two|three|einen|eine|zwei|drei|a\s?(?:4th|3rd|teammate|player))\b")
        .expect("valid regex")
});

static MODES: LazyLock<Vec<(Regex, &'static str)>> = LazyLock::new(|| {
    [
        (r"\branked\b", "Ranked"),
        (r"\bresurgence\b", "Resurgence"),
        (r"\brebirth\b", "Rebirth"),
        (r"\bbattle\s?royale\b|\bbr\b", "Battle Royale"),
        (r"\bplunder\b", "Plunder"),
        (r"\bkill\s?race\b", "Kill Race"),
        (r"\bwsow\b|\btournament\b|\bturnier\b", "Turnier"),
        (r"\bsearch\s?(?:and|&|n)\s?destroy\b|\bsnd\b", "Search & Destroy"),
        (r"\bhardpoint\b", "Hardpoint"),
        (r"\bzombies\b", "Zombies"),
        (r"\bmultiplayer\b|\bmp\b", "Multiplayer"),
        (r"\bquads\b", "Quads"),
        (r"\btrios\b", "Trios"),
        (r"\bduos\b", "Duos"),
        (r"\bsolos?\b", "Solos"),
    ]
    .into_iter()
    .map(|(re, label)| (Regex::new(&format!("(?i){re}")).expect("valid regex"), label))
    .collect()
});

const COD_KEYWORDS: &[&str] = &["call of duty", "warzone", "black ops", "modern warfare"];

pub fn is_cod_game(game: &str) -> bool {
    let g = game.to_lowercase();
    COD_KEYWORDS.iter().any(|k| g.contains(k))
}

pub fn extract_mode(title: &str) -> Option<String> {
    MODES
        .iter()
        .find(|(re, _)| re.is_match(title))
        .map(|(_, label)| (*label).to_string())
}

pub fn extract_needed(text: &str) -> Option<u8> {
    let caps = NEEDED_COUNT.captures(text)?;
    let word = caps.get(1)?.as_str().to_lowercase();
    Some(match word.as_str() {
        "2" | "two" | "zwei" => 2,
        "3" | "three" | "drei" => 3,
        _ => 1,
    })
}

/// Noisy-OR combination: independent hints reinforce each other but never exceed 1.
fn combine(a: f64, b: f64) -> f64 {
    1.0 - (1.0 - a) * (1.0 - b)
}

pub fn score_phrases(text: &str, list: &[Phrase], prefix: &str, keys: &mut Vec<String>) -> f64 {
    let mut score = 0.0;
    for p in list {
        if p.re.is_match(text) {
            score = combine(score, p.weight);
            keys.push(format!("{prefix}:{}", p.key));
        }
    }
    score
}

pub fn is_viewer_join_request(text: &str) -> bool {
    VIEWER_JOIN_REQUEST.is_match(text)
}

/// Aggregated, already time-decayed hints from public chat.
#[derive(Debug, Clone, Default)]
pub struct ChatSignals {
    pub search: f64,
    pub party: f64,
    pub in_match: f64,
    pub needed: Option<u8>,
    pub keys: Vec<String>,
}

pub struct Observation<'a> {
    pub is_live: bool,
    pub title: &'a str,
    pub game: &'a str,
    pub now: DateTime<Utc>,
    pub chat: &'a ChatSignals,
}

/// What the detector remembers about a channel between evaluations.
#[derive(Debug, Clone)]
pub struct Memory {
    pub status: Status,
    pub since: DateTime<Utc>,
    pub title: String,
    pub title_since: DateTime<Utc>,
}

impl Memory {
    pub fn fresh(now: DateTime<Utc>) -> Self {
        Memory {
            status: Status::Offline,
            since: now,
            title: String::new(),
            title_since: now,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Detection {
    pub status: Status,
    /// 0..=1. Estimates are capped below 1 because the app never knows for sure.
    pub confidence: f64,
    pub signals: Vec<String>,
    pub mode: Option<String>,
    pub players_needed: Option<u8>,
}

const MAX_ESTIMATE_CONFIDENCE: f64 = 0.97;
const ENTER_THRESHOLD: f64 = 0.5;
const STAY_SEARCHING_THRESHOLD: f64 = 0.35;
const SEARCH_GONE_THRESHOLD: f64 = 0.35;
const AMBIGUITY_MARGIN: f64 = 0.08;
const TYPICAL_MATCH_MINUTES: f64 = 25.0;

fn minutes_between(a: DateTime<Utc>, b: DateTime<Utc>) -> f64 {
    (b - a).num_seconds().max(0) as f64 / 60.0
}

/// A "LF1" that has been sitting in the title for an hour is weaker evidence
/// than one the streamer just typed.
fn title_freshness(minutes_unchanged: f64) -> f64 {
    if minutes_unchanged <= 20.0 {
        1.0
    } else {
        (1.0 - (minutes_unchanged - 20.0) / 140.0).max(0.5)
    }
}

pub fn detect(obs: &Observation, mem: &Memory) -> Detection {
    let mode = extract_mode(obs.title);
    if !obs.is_live {
        return Detection {
            status: Status::Offline,
            confidence: 1.0,
            signals: vec![],
            mode: None,
            players_needed: None,
        };
    }

    let mut keys: Vec<String> = Vec::new();
    if obs.game.trim().is_empty() {
        return Detection {
            status: Status::Unknown,
            confidence: 0.3,
            signals: vec!["category:missing".into()],
            mode,
            players_needed: None,
        };
    }
    if !is_cod_game(obs.game) {
        return Detection {
            status: Status::Live,
            confidence: 1.0,
            signals: vec!["category:non-cod".into()],
            mode: None,
            players_needed: None,
        };
    }
    keys.push("category:cod".into());

    let title_minutes = if obs.title == mem.title {
        minutes_between(mem.title_since, obs.now)
    } else {
        keys.push("title:changed".into());
        0.0
    };
    let freshness = title_freshness(title_minutes);
    if freshness < 1.0 {
        keys.push("title:stale".into());
    }

    let mut search = score_phrases(obs.title, &SEARCH_PHRASES, "title", &mut keys) * freshness;
    let mut party = score_phrases(obs.title, &PARTY_PHRASES, "title", &mut keys);
    let mut in_match = score_phrases(obs.title, &MATCH_PHRASES, "title", &mut keys);

    search = combine(search, obs.chat.search);
    party = combine(party, obs.chat.party);
    in_match = combine(in_match, obs.chat.in_match);
    keys.extend(obs.chat.keys.iter().cloned());

    // Temporal evidence: what usually follows the previous state.
    let elapsed = minutes_between(mem.since, obs.now);
    let search_gone = search < SEARCH_GONE_THRESHOLD;
    match mem.status {
        Status::Searching if search_gone => {
            party = combine(party, 0.62);
            keys.push("transition:search-ended".into());
        }
        Status::PartyFound if search_gone => {
            if elapsed >= 2.0 {
                in_match = combine(in_match, (0.45 + 0.05 * elapsed).min(0.8));
                keys.push("transition:party-settled".into());
            } else {
                party = combine(party, 0.55);
                keys.push("memory:party-recent".into());
            }
        }
        Status::InMatch if elapsed < TYPICAL_MATCH_MINUTES && search < 0.6 => {
            in_match = combine(in_match, (0.62 - 0.01 * elapsed).max(0.4));
            keys.push("memory:match-ongoing".into());
        }
        _ => {}
    }

    let search_threshold = if mem.status == Status::Searching {
        STAY_SEARCHING_THRESHOLD
    } else {
        ENTER_THRESHOLD
    };

    let mut candidates: Vec<(Status, f64)> = [
        (Status::Searching, search, search_threshold),
        (Status::PartyFound, party, ENTER_THRESHOLD),
        (Status::InMatch, in_match, ENTER_THRESHOLD),
    ]
    .into_iter()
    .filter(|(_, score, threshold)| *score >= *threshold)
    .map(|(s, score, _)| (s, score))
    .collect();
    candidates.sort_by(|a, b| b.1.total_cmp(&a.1));

    let players_needed = extract_needed(obs.title).or(obs.chat.needed);

    let (status, confidence) = match candidates.as_slice() {
        [] => (Status::Live, 1.0),
        [(s, c)] => (*s, *c),
        [(s1, c1), (_, c2), ..] => {
            if c1 - c2 < AMBIGUITY_MARGIN {
                keys.push("conflict:signals".into());
                (Status::Unknown, *c1 * 0.5)
            } else {
                (*s1, *c1)
            }
        }
    };

    let confidence = if status == Status::Live {
        confidence
    } else {
        confidence.clamp(0.0, MAX_ESTIMATE_CONFIDENCE)
    };

    Detection {
        status,
        confidence,
        signals: keys,
        mode,
        players_needed: if status == Status::Searching { players_needed } else { None },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    const WZ: &str = "Call of Duty: Warzone";

    fn run(title: &str, game: &str, mem: &Memory, now: DateTime<Utc>) -> Detection {
        let chat = ChatSignals::default();
        detect(
            &Observation {
                is_live: true,
                                title,
                game,
                now,
                chat: &chat,
            },
            mem,
        )
    }

    fn mem(status: Status, since_min_ago: i64, title: &str, now: DateTime<Utc>) -> Memory {
        Memory {
            status,
            since: now - Duration::minutes(since_min_ago),
            title: title.into(),
            title_since: now - Duration::minutes(since_min_ago),
        }
    }

    #[test]
    fn offline_is_certain() {
        let now = Utc::now();
        let chat = ChatSignals::default();
        let d = detect(
            &Observation { is_live: false, title: "", game: "", now, chat: &chat },
            &Memory::fresh(now),
        );
        assert_eq!(d.status, Status::Offline);
    }

    #[test]
    fn detects_search_from_title() {
        let now = Utc::now();
        let d = run("RANKED GRIND | LF1 !discord", WZ, &mem(Status::Live, 5, "x", now), now);
        assert_eq!(d.status, Status::Searching);
        assert_eq!(d.players_needed, Some(1));
        assert_eq!(d.mode.as_deref(), Some("Ranked"));
        assert!(d.confidence < 1.0);
    }

    #[test]
    fn detects_german_search() {
        let now = Utc::now();
        let d = run("Warzone Ranked – suche noch einen!", WZ, &mem(Status::Live, 5, "x", now), now);
        assert_eq!(d.status, Status::Searching);
    }

    #[test]
    fn single_weak_word_is_not_enough() {
        let now = Utc::now();
        let d = run("searching for the best loadout", WZ, &mem(Status::Live, 5, "x", now), now);
        assert_eq!(d.status, Status::Live);
    }

    #[test]
    fn search_then_title_change_means_party_found() {
        let now = Utc::now();
        let d = run("RANKED GRIND", WZ, &mem(Status::Searching, 3, "RANKED GRIND LF1", now), now);
        assert_eq!(d.status, Status::PartyFound);
    }

    #[test]
    fn party_found_settles_into_match() {
        let now = Utc::now();
        let d = run("RANKED GRIND", WZ, &mem(Status::PartyFound, 4, "RANKED GRIND", now), now);
        assert_eq!(d.status, Status::InMatch);
    }

    #[test]
    fn match_expires_back_to_live() {
        let now = Utc::now();
        let d = run("RANKED GRIND", WZ, &mem(Status::InMatch, 40, "RANKED GRIND", now), now);
        assert_eq!(d.status, Status::Live);
    }

    #[test]
    fn non_cod_category_is_plain_live() {
        let now = Utc::now();
        let d = run("LF1 valorant", "VALORANT", &mem(Status::Live, 5, "x", now), now);
        assert_eq!(d.status, Status::Live);
    }

    #[test]
    fn missing_category_is_unknown() {
        let now = Utc::now();
        let d = run("LF1", "", &mem(Status::Live, 5, "x", now), now);
        assert_eq!(d.status, Status::Unknown);
    }

    #[test]
    fn chat_signal_triggers_search() {
        let now = Utc::now();
        let chat = ChatSignals {
            search: 0.6,
            keys: vec!["chat:broadcaster:need-n".into()],
            needed: Some(2),
            ..Default::default()
        };
        let d = detect(
            &Observation { is_live: true, title: "RANKED", game: WZ, now, chat: &chat },
            &mem(Status::Live, 5, "RANKED", now),
        );
        assert_eq!(d.status, Status::Searching);
        assert_eq!(d.players_needed, Some(2));
    }

    #[test]
    fn conflicting_signals_are_unknown() {
        let now = Utc::now();
        let d = run("LF1 | squad full", WZ, &mem(Status::Live, 5, "x", now), now);
        assert_eq!(d.status, Status::Unknown);
    }
}
