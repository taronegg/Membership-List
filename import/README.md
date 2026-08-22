# Excel-Import

Setzt `design_handoff_kirchen_app/README.md` Abschnitt 10 um: einmaliger Import
der zwei Altdaten-Excel-Dateien in die Supabase-Datenbank.

> **Hinweis:** Die beiden Original-Excel-Dateien (`1_ELK_Basel_Personen.xlsx`,
> `2_ELK_Basel_Anwesenheit.xlsx`) lagen diesem Auftrag nicht bei — nur das
> Handoff-Dokument selbst. Das Skript ist strikt nach der in Abschnitt 4/10
> beschriebenen Spalten- und Blattstruktur geschrieben und mit synthetischen
> Testdaten geprüft (`test/`), konnte aber **nicht gegen die echten Dateien
> verifiziert werden**. Vor dem produktiven Import: einmal mit den echten
> Dateien im Dry-Run laufen lassen und den Fehlerbericht durchgehen, bevor
> `--apply` verwendet wird.

## Voraussetzungen

- Die Migrationen in `supabase/migrations/` sind bereits angewendet.
- `.env` (siehe `.env.example`) mit `SUPABASE_URL` und
  `SUPABASE_SERVICE_ROLE_KEY` (nicht der Anon-Key — der Import umgeht RLS
  bewusst, weil er kein eingeloggter Leiter ist, sondern ein administrativer
  Einmalvorgang).

```bash
cd import
npm install
cp .env.example .env   # dann echte Werte eintragen
```

## Ausführen

```bash
# 1. Dry-Run: liest beide Dateien, meldet Fehler/Hinweise, schreibt NICHTS.
npm run import -- --personen /pfad/zu/1_ELK_Basel_Personen.xlsx \
                   --anwesenheit /pfad/zu/2_ELK_Basel_Anwesenheit.xlsx

# 2. Erst wenn der Fehlerbericht sauber ist: tatsächlich schreiben.
npm run import -- --personen /pfad/zu/1_ELK_Basel_Personen.xlsx \
                   --anwesenheit /pfad/zu/2_ELK_Basel_Anwesenheit.xlsx \
                   --apply
```

Reihenfolge intern (Abschnitt 10): Listen → Leiter → Personen → Kontakte →
Anwesenheit → Events → Verifikation gegen das Blatt „Auswertung" (wird nicht
importiert, sondern zur Gegenprobe der Berechnungslogik verwendet — Schritt 7).

## Was das Skript NICHT automatisch löst

- **Blattname/Spalten-Layout unbekannt für „Listen".** Abschnitt 4.5 nennt nur,
  welche Listen existieren, nicht das exakte Spaltenlayout des versteckten
  Blatts. Das Skript liest es generisch (jede Kopfzellen-Spalte wird zu einer
  Liste ihrer Werte) — beim ersten Dry-Run prüfen, ob `Verantwortliche`,
  `Status`, `Bacenta`, `Basonta`, `Bildung`, `Bildungsjahr`, `Wie entdeckt` und
  `Kontaktart` als Spaltennamen erkannt werden (Hinweise im Report).
- **Anwesenheits-Layout** wird per Abschnitt 4.3 angenommen: Spalte A = ID,
  Spalte B = Name, ab Spalte C die Sonntage. Fällt Spalte C nicht als Zahl auf,
  sucht das Skript die erste numerische Kopfzelle als Fallback.
- **Zellkommentare (Abwesenheitsgrund):** werden nur übernommen, wenn die
  installierte `xlsx`-Version sie beim Einlesen als `cell.c` liefert (siehe
  Abschnitt 10, Schritt 5 — "falls die Import-Bibliothek sie liefert"). Falls
  nicht, bleibt `grund` `null`; das ist kein Fehler.
- **Neu angelegte Leiter** bekommen Platzhalter-E-Mails
  (`vorname@example.org`) und kein `auth_user_id`. Vor dem Produktivgang durch
  echte Logins ersetzen (siehe `supabase/README.md`).

## Tests

`npm test` prüft die reinen Parsing-Funktionen (Datum, Kreuztabellen-Auflösung,
Namens-Normalisierung) gegen synthetisch erzeugte Workbooks — ohne Netzwerk/DB.
