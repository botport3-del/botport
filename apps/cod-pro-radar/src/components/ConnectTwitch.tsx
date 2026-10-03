import { useEffect, useState } from "react";
import { api, errorMessage, onAuthEvent } from "../api";
import type { DeviceStart, Health } from "../types";

export function ConnectTwitch({ health, compact }: { health: Health; compact?: boolean }) {
  const [device, setDevice] = useState<DeviceStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const un = onAuthEvent((e) => {
      setDevice(null);
      if (e.status === "expired") setError("Der Code ist abgelaufen. Bitte erneut verbinden.");
      else if (e.status === "denied") setError("Die Anmeldung wurde auf Twitch abgelehnt.");
      else if (e.status === "error") setError(e.message ?? "Anmeldung fehlgeschlagen.");
      else setError(null);
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const d = await api.authStart();
      setDevice(d);
      await api.openVerification();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (health.authenticated) {
    return (
      <div className="connect connect--ok">
        <span className="connect__icon" aria-hidden>✔</span>
        <div>
          <strong>Verbunden als {health.login}</strong>
          <p className="muted small">Die App liest nur öffentliche Stream-Infos. Dein Token liegt in der Windows-Anmeldeinformationsverwaltung.</p>
        </div>
        <button className="btn btn--ghost btn--small" onClick={() => api.authLogout()}>Trennen</button>
      </div>
    );
  }

  return (
    <div className={`connect ${compact ? "connect--compact" : ""}`}>
      <div className="connect__intro">
        <span className="connect__icon connect__icon--twitch" aria-hidden>⬢</span>
        <div>
          <strong>Mit Twitch verbinden</strong>
          <p className="muted small">
            Nötig für die offizielle Twitch-API. Es werden keine Passwörter und keine COD-Accounts benötigt.
          </p>
        </div>
      </div>
      {!health.client_id_set && (
        <p className="notice notice--warn">
          Trage zuerst unter <em>Einstellungen → Twitch-Verbindung</em> deine Twitch Client-ID ein.
        </p>
      )}
      {device ? (
        <div className="device">
          <p>Öffne <strong>twitch.tv/activate</strong> und gib diesen Code ein:</p>
          <div className="device__code">{device.user_code}</div>
          <div className="device__actions">
            <button className="btn btn--twitch" onClick={() => api.openVerification()}>Twitch-Seite öffnen</button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                api.authCancel();
                setDevice(null);
              }}
            >
              Abbrechen
            </button>
          </div>
          <p className="muted small"><span className="spinner" aria-hidden /> Warte auf Bestätigung…</p>
        </div>
      ) : (
        <button className="btn btn--twitch" disabled={busy || !health.client_id_set} onClick={start}>
          {busy ? "Starte…" : "Mit Twitch verbinden"}
        </button>
      )}
      {error && <p className="notice notice--error">{error}</p>}
    </div>
  );
}
