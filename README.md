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

Alle neun Schritte sind umgesetzt:

1. ✅ Datenbankschema + RLS
2. ✅ Excel-Import-Skript (ungetestet gegen die echten Dateien -- siehe `import/README.md`)
3. ✅ Auth + zwei Rollen
4. ✅ Personenliste + Personen-Detail (Sub-Tab Profil)
5. ✅ Berechnungslogik als getestete Funktionen (`shared/berechnungen.test.ts`)
6. ✅ Check-in inkl. Offline-Puffer (IndexedDB-Outbox, siehe `app/src/lib/offlineOutbox.ts`)
7. ✅ Kontakte + Wiedervorlage (inkl. "erledigt"-Zustand, Lücke 12.1)
8. ✅ Übersicht (Home)
9. ✅ Events (inkl. Anlegen, Lücke 12.2)

Zusätzlich (über die neun Schritte hinaus, aber nötig für echten Betrieb):

- ✅ 7.4 Person anlegen/bearbeiten
- ✅ PWA-Manifest + Icons ("Zum Home-Bildschirm hinzufügen")

## Was bewusst noch fehlt

- **Audit-Log, Lesezugriffe** (Abschnitt 11): Schreibzugriffe auf `contacts`
  werden per DB-Trigger protokolliert, Lesezugriffe auf die Notizen bräuchten
  eine serverseitige Stelle (z.B. eine Edge Function) -- siehe
  `supabase/README.md`.
- **Import gegen die echten Excel-Dateien**: Das Skript ist gegen ein
  synthetisches Workbook getestet, weil die beiden Original-Dateien diesem
  Auftrag nicht beilagen -- siehe `import/README.md`.
- **Abschnitt 12, Lücken 4-6** (Personen zusammenführen, Statushistorie,
  Mandantenfähigkeit über eine Gemeinde hinaus) sind unverändert offen; 6 ist
  auf Schema-Ebene vorbereitet (`gemeinde_id`), aber nicht in der UI nutzbar.
- **Offline** deckt bisher nur den Check-in-Schreibpfad ab (die harte
  Anforderung aus Abschnitt 3). Lesen ohne Verbindung (Personenliste etc.
  aus dem Cache) ist nicht umgesetzt.

## Tests

```bash
(cd shared && npm install && npm test)
(cd import && npm install && npm test)
(cd app && npm install && npm test)
```
