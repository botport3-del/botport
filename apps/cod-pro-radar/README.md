# COD Pro Radar

Windows-Desktop-App (Tauri + React + TypeScript + Rust + SQLite), die ausgewählte
Twitch-Kanäle von Call-of-Duty-Pros und -Streamern überwacht und anzeigt, wer gerade
live ist und ob jemand **vermutlich** gerade Mitspieler sucht.

> Die App ist ein **Radar**, keine LFG-Plattform: Sie vermittelt keine Spieler, braucht
> keine COD-Accounts und liest ausschließlich öffentliche Twitch-Daten. Jeder
> Aktivitätsstatus ist eine Schätzung und wird immer als „vermutlich“ / „erkannt“
> angezeigt.

## Funktionen

| Bereich | Umsetzung |
| --- | --- |
| **Meine Pros** | Liste mit Profilbild, Live/Offline, Spiel + Modus (z. B. „Warzone · Ranked“), Status, Streamtitel, Zuschauer, Zeitpunkt der letzten Statusänderung, Button „Stream öffnen“. Filter (Alle / Live / Sucht / Offline), Suche, Sortierung nach Relevanz. |
| **Statussystem** | ⚪ Offline · 🔴 Live · 🟡 Suche · 🟢 Party gefunden · 🔵 Im Match · ⚫ Unklar |
| **Erkennung** | Kombiniert mehrere öffentliche Signale mit Gewichtung, Confidence-Wert, Hysterese und zeitlicher Logik (siehe unten). |
| **Details** | Großer Status, Confidence-Balken, verständlich erklärte Hinweise („Streamtitel enthält ‚LF1‘“), Stream-Infos, Aktivitäts-Historie des Pros. |
| **Aktivität** | Zeitleiste aller Statusänderungen (30 Tage), filterbar pro Pro. |
| **Benachrichtigungen** | Native Windows-Toasts mit Button **„Stream öffnen“**. Einzeln schaltbar: Suche, Party gefunden, Im Match, Stream gestartet, Stream beendet; Mindest-Confidence, Sperrzeit gegen Spam, Ton, Ruhezeiten, pro Pro abschaltbar, Test-Benachrichtigung. |
| **Hintergrundbetrieb** | Symbol im Infobereich (Tooltip zeigt Anzahl live/suchend), Schließen minimiert in den Infobereich, nur eine Instanz. |
| **Effizienz** | Alle Kanäle in **einer** Helix-Anfrage (bis 100 pro Anfrage); Profile nur 1× täglich; Schnellmodus (20 s) nur während eine Suche/Party aktiv ist; Chat nur für Kanäle, die live sind. |

## Wie die Erkennung funktioniert

Quelle: `src-tauri/src/detector.rs` (mit Unit-Tests).

1. **Kategorie** – nur bei Call of Duty (Warzone, Black Ops, MW …) wird Aktivität
   geschätzt. Andere Spiele → 🔴 Live; fehlende Kategorie → ⚫ Unklar.
2. **Streamtitel** – gewichtete Phrasen, englisch und deutsch, z. B. `LFG`, `LF1`, `need 1/2`,
   `need one`, `looking for 1/2`, `need teammate(s)`, `searching`, `anyone join`, `join`,
   `suche 1/2`, `suche noch einen`, `brauche einen/2`, `Mitspieler gesucht`.
   Ein einzelnes schwaches Wort (z. B. nur „searching“) reicht **nicht**.
   Titel, die sich lange nicht geändert haben, zählen schwächer.
3. **Öffentlicher Chat** (optional) – anonyme, schreibgeschützte Verbindung zur
   offiziellen Twitch-Chat-Schnittstelle. Gewertet werden nur Nachrichten des
   Streamers und seiner Moderatoren (Chat-Bots wie Nightbot werden ignoriert) sowie
   gehäufte „inv me / add me“-Anfragen von Zuschauern als schwaches Zusatzsignal.
   Signale verfallen mit einer Halbwertszeit von 3 Minuten. **Nachrichten werden nicht
   gespeichert.**
4. **Zeitliche Übergänge** – Suche verschwindet → 🟢 Party vermutlich gefunden;
   Party seit ≥ 2 Min. stabil → 🔵 vermutlich im Match; nach typischer Matchdauer
   (~25 Min.) ohne neue Hinweise → zurück zu 🔴 Live.
5. **Confidence** – Signale werden per Noisy-OR kombiniert. Schwellwert 50 % zum
   Wechseln, 35 % zum Bleiben in „Suche“ (verhindert Flackern). Liegen zwei
   Schätzungen fast gleichauf → ⚫ Unklar. Schätzungen sind auf max. 97 % gedeckelt –
   die App behauptet nie, etwas sicher zu wissen.

## Einrichtung

### 1. Twitch-Anwendung anlegen (einmalig, kostenlos)

1. <https://dev.twitch.tv/console/apps> → **Register Your Application**
2. Name: beliebig (z. B. „COD Pro Radar – <dein Name>“)
3. OAuth Redirect URL: `http://localhost`
4. Kategorie: **Application Integration**
5. Client-Typ: **Öffentlich (Public)** – wichtig, die App nutzt den Device-Code-Flow
   ohne Client-Secret.
6. Die **Client-ID** kopieren und in der App unter *Einstellungen → Twitch-Verbindung*
   eintragen.

Alternativ kann beim Build eine Standard-Client-ID eingebacken werden:
`COD_RADAR_TWITCH_CLIENT_ID=… pnpm tauri build`.

### 2. Mit Twitch verbinden

In der App auf **„Mit Twitch verbinden“** klicken, den angezeigten Code auf
`twitch.tv/activate` eingeben, fertig. Das Token liegt in der
Windows-Anmeldeinformationsverwaltung (nicht in der Datenbank) und wird automatisch
erneuert und stündlich validiert. Angefragter Scope: nur `user:read:follows`
(für Vorschläge „Gefolgte Kanäle, die gerade COD streamen“).

### 3. Pros hinzufügen

*Meine Pros → + Pro hinzufügen* – Namen oder Twitch-Links, mehrere durch Komma getrennt.

## Entwicklung

Voraussetzungen (Windows): Node ≥ 20, pnpm 10, Rust (stable), Microsoft C++ Build Tools,
WebView2 (bei Windows 10/11 vorinstalliert). Siehe <https://tauri.app/start/prerequisites/>.

```bash
pnpm install --filter cod-pro-radar
cd apps/cod-pro-radar

pnpm tauri dev        # App mit Hot-Reload starten
pnpm dev              # nur die Oberfläche im Browser – läuft im Demo-Modus mit Beispieldaten
pnpm typecheck        # TypeScript prüfen
cd src-tauri && cargo test   # Erkennung, Datenbank, Chat-Parser, Benachrichtigungsregeln
```

### Installer bauen

```bash
cd apps/cod-pro-radar
pnpm tauri build
# → src-tauri/target/release/bundle/nsis/COD Pro Radar_0.1.0_x64-setup.exe
# → src-tauri/target/release/bundle/msi/COD Pro Radar_0.1.0_x64_de-DE.msi
```

Der GitHub-Workflow `.github/workflows/cod-pro-radar-windows.yml` baut den Installer
automatisch auf `windows-latest` und stellt ihn als Artefakt bereit.

## Architektur

```
src/                     React-Oberfläche
  pages/                 Meine Pros, Aktivität, Einstellungen
  components/            Zeile, Detailansicht, Zeitleiste, Dialoge, Twitch-Verbindung
  lib/status.ts          Statusbezeichnungen (immer „vermutlich“), Signal-Erklärungen
  api.ts                 Tauri-Befehle + Events (radar://state, radar://auth)
  mock.ts                Demo-Backend für die Browser-Vorschau
src-tauri/src/
  monitor.rs             Hintergrundschleife: Abfrage, Erkennung, Speicherung, Benachrichtigung
  detector.rs            Signal- und Confidence-System
  twitch.rs              Helix-API + OAuth Device-Code-Flow, Token in Windows-Credential-Manager
  chat.rs                Anonymer, schreibgeschützter Twitch-Chat (IRC über WebSocket)
  notify.rs              Benachrichtigungsregeln + Windows-Toast mit „Stream öffnen“
  db.rs                  SQLite (Pros, letzter Zustand, Aktivität, Einstellungen)
  lib.rs                 Tauri-Befehle, Infobereich-Symbol, Fenster-Verhalten
```

Lokale Daten: `%APPDATA%\app.codproradar.desktop\radar.sqlite3`.

## Datenschutz

- Nur öffentliche Twitch-Daten über offizielle Schnittstellen (Helix-API, Twitch-Chat).
- Keine COD-Accounts, keine privaten Daten, keine Weitergabe an Dritte.
- Chat-Nachrichten werden ausschließlich im Arbeitsspeicher ausgewertet, nie gespeichert.
- Alle Daten bleiben lokal auf dem PC.
