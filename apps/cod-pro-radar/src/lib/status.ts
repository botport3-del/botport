import type { Snapshot, Status } from "../types";

export const STATUS_EMOJI: Record<Status, string> = {
  OFFLINE: "⚪",
  LIVE: "🔴",
  SEARCHING: "🟡",
  PARTY_FOUND: "🟢",
  IN_MATCH: "🔵",
  UNKNOWN: "⚫",
};

/** Short label for badges. Estimates are always worded as such. */
export const STATUS_SHORT: Record<Status, string> = {
  OFFLINE: "Offline",
  LIVE: "Live",
  SEARCHING: "Suche erkannt",
  PARTY_FOUND: "Party vermutlich gefunden",
  IN_MATCH: "Vermutlich im Match",
  UNKNOWN: "Unklar",
};

/** Label used in the activity history. */
export const STATUS_HISTORY: Record<Status, string> = {
  OFFLINE: "Stream beendet",
  LIVE: "Live",
  SEARCHING: "Suche nach Spielern erkannt",
  PARTY_FOUND: "Party vermutlich gefunden",
  IN_MATCH: "Vermutlich im Match",
  UNKNOWN: "Status unklar",
};

export const STATUS_DESCRIPTION: Record<Status, string> = {
  OFFLINE: "Der Twitch-Kanal ist nicht live.",
  LIVE: "Live, aber keine bestimmte Aktivität erkannt.",
  SEARCHING: "Es gibt Hinweise, dass vermutlich Mitspieler gesucht werden.",
  PARTY_FOUND: "Hinweise deuten darauf hin, dass die Suche beendet und vermutlich eine Party gefunden wurde.",
  IN_MATCH: "Hinweise deuten darauf hin, dass gerade ein Match läuft.",
  UNKNOWN: "Die verfügbaren Informationen reichen nicht für eine zuverlässige Einschätzung.",
};

export const IS_ESTIMATE: Record<Status, boolean> = {
  OFFLINE: false,
  LIVE: false,
  SEARCHING: true,
  PARTY_FOUND: true,
  IN_MATCH: true,
  UNKNOWN: true,
};

const SORT_ORDER: Record<Status, number> = {
  SEARCHING: 0,
  PARTY_FOUND: 1,
  IN_MATCH: 2,
  LIVE: 3,
  UNKNOWN: 4,
  OFFLINE: 5,
};

export function statusRank(s: Snapshot | null): number {
  return s ? SORT_ORDER[s.status] : 6;
}

export function headline(name: string, s: Snapshot | null): string {
  if (!s) return `${name}: noch keine Daten`;
  switch (s.status) {
    case "SEARCHING":
      if (s.players_needed === 1) return `${name} sucht vermutlich 1 Spieler`;
      if (s.players_needed) return `${name} sucht vermutlich ${s.players_needed} Spieler`;
      return `${name} sucht vermutlich Mitspieler`;
    case "PARTY_FOUND":
      return `${name} hat vermutlich eine Party gefunden`;
    case "IN_MATCH":
      return `${name} ist vermutlich im Match`;
    case "LIVE":
      return `${name} ist live`;
    case "UNKNOWN":
      return `${name}: Status unklar`;
    case "OFFLINE":
      return `${name} ist offline`;
  }
}

const PHRASES: Record<string, string> = {
  lfg: "„LFG“",
  "lf-n": "„LF1 / LF2“",
  "need-n": "„need 1 / need 2“",
  "need-word": "„need one / need two“",
  "need-teammate": "„need teammate(s)“",
  "looking-for": "„looking for 1 / looking for teammates“",
  "looking-for-generic": "„looking for“",
  searching: "„searching“",
  "anyone-join": "„anyone wanna play / join“",
  join: "„join me / join us“",
  "viewer-games": "„viewer games“",
  suche: "„suche 1 / suche noch einen“",
  brauche: "„brauche einen / brauche 2“",
  gesucht: "„Mitspieler gesucht“",
  "wer-will-mit": "„wer will mit“",
  "full-squad": "„full squad“",
  "squad-full": "„squad full“",
  "got-one": "„got one“",
  "found-one": "„found one“",
  "we-are-full": "„we're full / we're good“",
  "wir-sind-voll": "„wir sind voll“",
  "haben-einen": "„haben einen“",
  "team-voll": "„Team voll“",
  "in-match": "„in match / in game“",
  dropping: "„dropping / we're in“",
  "kill-race": "„kill race“",
  tournament: "„Turnier / Wager“",
};

const FIXED: Record<string, string> = {
  "category:cod": "Kategorie ist Call of Duty",
  "category:non-cod": "Kategorie ist kein Call-of-Duty-Spiel",
  "category:missing": "Keine Kategorie gesetzt",
  "title:changed": "Streamtitel wurde gerade geändert",
  "title:stale": "Titel ist seit längerem unverändert – schwächeres Signal",
  "chat:viewers:join-requests": "Mehrere Zuschauer fragen im Chat nach einer Einladung",
  "transition:search-ended": "Such-Hinweise sind verschwunden → Party vermutlich gefunden",
  "transition:party-settled": "Party seit einigen Minuten stabil → vermutlich im Match",
  "memory:party-recent": "Party wurde gerade erst erkannt",
  "memory:match-ongoing": "Match läuft vermutlich noch (typische Matchdauer)",
  "conflict:signals": "Widersprüchliche Hinweise – keine sichere Einschätzung möglich",
};

export function explainSignal(key: string): string[] {
  return key.split("+").map((k) => {
    if (FIXED[k]) return FIXED[k];
    const [source, who, phrase] = k.split(":");
    if (source === "title") return `Streamtitel enthält ${PHRASES[who] ?? who}`;
    if (source === "chat") {
      const role = who === "broadcaster" ? "Streamer" : "Moderator";
      return `${role} schreibt im Chat ${PHRASES[phrase] ?? phrase}`;
    }
    return k;
  });
}

export function shortGame(game: string | null): string {
  if (!game) return "";
  return game.replace(/^Call of Duty:\s*/i, "");
}

export function activityLine(isLive: boolean, game: string | null, mode: string | null): string {
  if (!isLive) return "Offline";
  return [shortGame(game), mode].filter(Boolean).join(" · ") || "Live";
}
