# Kirchen-Mitgliederverwaltung (ELK Basel)

Siehe `design_handoff_kirchen_app/README.md` für das vollständige Handoff-Dokument
(Datenmodell, Rollen, Berechnungslogik, Screens, Design-Tokens, Import-Regeln).
Dieses README ist nur eine Landkarte durch das Repo.

## Struktur

| Verzeichnis | Inhalt |
| --- | --- |
| `design_handoff_kirchen_app/` | Das Handoff-Dokument (Quelle der Wahrheit für Anforderungen). |
| `supabase/` | Postgres-Schema + RLS-Policies (Abschnitt 4/5.6/11). |
| `shared/` | Berechnungslogik (Abschnitt 5) + Import-Hilfsfunktionen, gemeinsam von `app/` und `import/` genutzt. |
| `import/` | Einmaliges Excel-Import-Skript (Abschnitt 10). |
| `app/` | React/Vite-PWA-Frontend (Abschnitt 3/6/7/9). |

## Stand (Abschnitt 13, "Erste Schritte")

1. ✅ Datenbankschema + RLS
2. ✅ Excel-Import-Skript (ungetestet gegen die echten Dateien -- siehe `import/README.md`)
3. ✅ Auth + zwei Rollen
4. ✅ Personenliste + Personen-Detail (Sub-Tab Profil)
5. ✅ Berechnungslogik als getestete Funktionen (`shared/berechnungen.test.ts`)
6. ⏳ Check-in inkl. Offline-Puffer
7. ⏳ Kontakte + Wiedervorlage
8. ⏳ Übersicht (Home)
9. ⏳ Events

## Tests

```bash
(cd shared && npm install && npm test)
(cd import && npm install && npm test)
(cd app && npm install && npm test)
```
