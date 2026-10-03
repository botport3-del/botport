import { useEffect, useState } from "react";
import { api, errorMessage } from "../api";
import type { AddResult, Suggestion } from "../types";
import { Modal } from "./ui";
import { shortGame } from "../lib/status";
import { viewers } from "../lib/format";

export function AddStreamerDialog({ onClose, authenticated }: { onClose: () => void; authenticated: boolean }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    api.suggestFollowed().then(setSuggestions).catch((e) => setSuggestError(errorMessage(e)));
  }, [authenticated]);

  async function add(text: string) {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.addStreamers(text);
      setResult(r);
      if (r.added.length > 0) {
        setInput("");
        setSuggestions((s) => s?.filter((x) => !r.added.some((a) => a.toLowerCase() === x.login)) ?? s);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Pros hinzufügen"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Fertig</button>
          <button className="btn btn--primary" disabled={busy || !input.trim() || !authenticated} onClick={() => add(input)}>
            {busy ? "Prüfe…" : "Hinzufügen"}
          </button>
        </>
      }
    >
      {!authenticated && (
        <p className="notice notice--warn">Verbinde zuerst deinen Twitch-Account in den Einstellungen, damit Kanalnamen geprüft werden können.</p>
      )}
      <label className="field">
        <span className="field__label">Twitch-Kanäle</span>
        <textarea
          autoFocus
          rows={3}
          placeholder="z. B. pirate, dki oder https://twitch.tv/kanalname"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) add(input);
          }}
        />
        <span className="field__hint">Mehrere Namen mit Komma, Leerzeichen oder Zeilenumbruch trennen. Strg + Enter zum Hinzufügen.</span>
      </label>

      {error && <p className="notice notice--error">{error}</p>}
      {result && (
        <div className="add-result">
          {result.added.length > 0 && <p className="notice notice--ok">Hinzugefügt: {result.added.join(", ")}</p>}
          {result.already.length > 0 && <p className="notice">Bereits in der Liste: {result.already.join(", ")}</p>}
          {result.not_found.length > 0 && <p className="notice notice--warn">Nicht auf Twitch gefunden: {result.not_found.join(", ")}</p>}
          {result.invalid.length > 0 && <p className="notice notice--warn">Ungültige Namen: {result.invalid.join(", ")}</p>}
        </div>
      )}

      {authenticated && (
        <div className="suggestions">
          <h3>Gefolgte Kanäle, die gerade COD streamen</h3>
          {suggestError && <p className="muted">{suggestError}</p>}
          {!suggestError && suggestions === null && <p className="muted">Lade…</p>}
          {suggestions?.length === 0 && <p className="muted">Gerade streamt keiner deiner gefolgten Kanäle Call of Duty.</p>}
          <ul>
            {suggestions?.map((s) => (
              <li key={s.login}>
                <div>
                  <strong>{s.display_name}</strong>
                  <small>{shortGame(s.game_name)} · {viewers(s.viewer_count)}</small>
                  <small className="ellipsis">{s.title}</small>
                </div>
                <button className="btn btn--small" disabled={busy} onClick={() => add(s.login)}>+ Hinzufügen</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
