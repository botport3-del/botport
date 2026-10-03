import { useEffect, useState } from "react";
import { api, errorMessage, inTauri } from "../api";
import type { Health, Settings } from "../types";
import { ConnectTwitch } from "../components/ConnectTwitch";
import { Toggle } from "../components/ui";

const POLL_OPTIONS = [30, 45, 60, 90, 120, 180, 300];

export function SettingsPage({
  settings,
  health,
  onChange,
}: {
  settings: Settings;
  health: Health;
  onChange: (s: Settings) => void;
}) {
  const [clientId, setClientId] = useState(settings.twitch_client_id);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => setClientId(settings.twitch_client_id), [settings.twitch_client_id]);

  async function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    onChange(next);
    try {
      onChange(await api.saveSettings(next));
      setError(null);
      setSavedAt(Date.now());
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const t = (key: keyof Settings) => ({
    checked: settings[key] as boolean,
    onChange: (v: boolean) => update({ [key]: v } as Partial<Settings>),
  });

  return (
    <div className="page settings">
      <header className="page__header">
        <div>
          <h1>Einstellungen</h1>
          <p className="muted">
            Änderungen werden automatisch gespeichert
            {savedAt && <span className="saved"> · gespeichert ✓</span>}
          </p>
        </div>
      </header>
      {error && <p className="notice notice--error">{error}</p>}

      <section className="card">
        <h2>Twitch-Verbindung</h2>
        <label className="field">
          <span className="field__label">Twitch Client-ID</span>
          <input
            type="text"
            spellCheck={false}
            autoComplete="off"
            value={clientId}
            placeholder="z. B. abcdef0123456789…"
            onChange={(e) => setClientId(e.target.value)}
            onBlur={() => clientId.trim() !== settings.twitch_client_id && update({ twitch_client_id: clientId.trim() })}
          />
          <span className="field__hint">
            Einmalig eine eigene Anwendung in der Twitch-Developer-Konsole anlegen: Kategorie „Application Integration“,
            Client-Typ <strong>„Öffentlich / Public“</strong>, OAuth-Redirect <code>http://localhost</code>. Ein Client-Secret wird nicht benötigt.{" "}
            <button className="link" onClick={() => api.openTwitchConsole()}>Twitch-Konsole öffnen</button>
          </span>
        </label>
        <ConnectTwitch health={health} />
        {health.last_error && <p className="notice notice--error">Letzter Fehler: {health.last_error}</p>}
      </section>

      <section className="card">
        <h2>Überwachung</h2>
        <label className="field field--inline">
          <span className="field__label">Abfrage-Intervall</span>
          <select
            value={settings.poll_interval_seconds}
            onChange={(e) => update({ poll_interval_seconds: Number(e.target.value) })}
          >
            {POLL_OPTIONS.map((s) => (
              <option key={s} value={s}>{s < 60 ? `${s} Sekunden` : `${s / 60} Minute${s === 60 ? "" : "n"}`}</option>
            ))}
          </select>
        </label>
        <p className="field__hint">
          Alle Kanäle werden in einer einzigen Anfrage abgefragt (bis zu 100 pro Anfrage). Profilbilder werden nur einmal täglich aktualisiert.
        </p>
        <Toggle
          {...t("fast_mode")}
          label="Schnellmodus bei Suche"
          description="Während ein Pro vermutlich sucht oder gerade eine Party gefunden hat, alle 20 Sekunden prüfen."
        />
        <Toggle
          {...t("use_chat_signals")}
          label="Öffentliche Chat-Signale nutzen"
          description="Liest anonym und schreibgeschützt den öffentlichen Chat live gehender Kanäle. Gewertet werden nur Nachrichten des Streamers und seiner Moderatoren sowie gehäufte „inv me“-Anfragen. Es werden keine Nachrichten gespeichert."
        />
        <p className="muted small">
          Chat: {health.chat_enabled ? (health.chat_connected ? "verbunden" : "nicht verbunden (nur wenn ein Pro live ist)") : "deaktiviert"}
        </p>
      </section>

      <section className="card">
        <h2>Benachrichtigungen</h2>
        <p className="muted small">Windows-Benachrichtigungen mit „Stream öffnen“-Button. Pro Pro abschaltbar in der Detailansicht.</p>
        <Toggle {...t("notify_searching")} label="🟡 Pro sucht vermutlich Spieler" description="Die wichtigste Benachrichtigung." />
        <Toggle {...t("notify_party_found")} label="🟢 Party vermutlich gefunden" description="Nur nach einer vorher erkannten Suche." />
        <Toggle {...t("notify_in_match")} label="🔵 Vermutlich im Match" />
        <Toggle {...t("notify_live")} label="🔴 Stream gestartet" />
        <Toggle {...t("notify_offline")} label="⚪ Stream beendet" />
        <Toggle {...t("notify_sound")} label="Ton abspielen" />

        <label className="field">
          <span className="field__label">
            Mindest-Confidence für Schätzungen: <strong>{settings.notify_min_confidence} %</strong>
          </span>
          <input
            type="range"
            min={30}
            max={95}
            step={5}
            value={settings.notify_min_confidence}
            onChange={(e) => update({ notify_min_confidence: Number(e.target.value) })}
          />
          <span className="field__hint">Höher = weniger, aber zuverlässigere Benachrichtigungen.</span>
        </label>

        <label className="field field--inline">
          <span className="field__label">Gleiche Meldung pro Pro höchstens alle</span>
          <select
            value={settings.notify_cooldown_minutes}
            onChange={(e) => update({ notify_cooldown_minutes: Number(e.target.value) })}
          >
            {[0, 1, 3, 5, 10, 15, 30].map((m) => (
              <option key={m} value={m}>{m === 0 ? "ohne Sperre" : `${m} Minuten`}</option>
            ))}
          </select>
        </label>

        <Toggle {...t("quiet_hours_enabled")} label="Ruhezeiten (Nicht stören)" description="In diesem Zeitraum keine Benachrichtigungen." />
        {settings.quiet_hours_enabled && (
          <div className="quiet-hours">
            <label>
              von <input type="time" value={settings.quiet_hours_start} onChange={(e) => update({ quiet_hours_start: e.target.value })} />
            </label>
            <label>
              bis <input type="time" value={settings.quiet_hours_end} onChange={(e) => update({ quiet_hours_end: e.target.value })} />
            </label>
          </div>
        )}
        <button className="btn btn--ghost" onClick={() => api.testNotification()} disabled={!inTauri}>
          Test-Benachrichtigung senden
        </button>
      </section>

      <section className="card">
        <h2>Darstellung & App</h2>
        <Toggle {...t("show_confidence")} label="Confidence-Werte anzeigen" description="Zeigt bei geschätzten Status die Sicherheit in Prozent." />
        <Toggle
          {...t("close_to_tray")}
          label="Beim Schließen im Infobereich weiterlaufen"
          description="Das Radar überwacht im Hintergrund weiter und benachrichtigt dich."
        />
      </section>

      <section className="card">
        <h2>Datenschutz & Fairness</h2>
        <ul className="bullets">
          <li>Es werden ausschließlich öffentliche Twitch-Daten über die offizielle Twitch-API und den öffentlichen Chat gelesen.</li>
          <li>Keine COD-Accounts, keine privaten Daten, keine Vermittlung von Spielern.</li>
          <li>Alle Daten (Pros, Verlauf, Einstellungen) liegen lokal in einer SQLite-Datenbank auf deinem PC.</li>
          <li>Jede Aktivitäts-Erkennung ist eine Schätzung und wird als „vermutlich“ bzw. „erkannt“ angezeigt.</li>
        </ul>
      </section>
    </div>
  );
}
