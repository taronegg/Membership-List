# Datenbank (Supabase / Postgres)

Setzt `design_handoff_kirchen_app/README.md` Abschnitt 4 (Datenmodell) und 5.6
(Sichtbarkeit/RLS) um.

## Anwenden

```bash
supabase init          # falls noch kein Supabase-Projekt verknüpft ist
supabase link --project-ref <projekt-ref>
supabase db push        # spielt supabase/migrations/*.sql der Reihe nach ein
```

Oder lokal gegen `supabase start` / eine beliebige Postgres-Instanz mit `psql`:

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_rls.sql
```

## Dateien

- `0001_schema.sql` — Tabellen, pflegbare Stammlisten (4.5), Sequenzen, Seed-Daten
  für Listen und Leiter.
- `0002_rls.sql` — RLS-Policies (5.6) + Audit-Log-Trigger für `contacts` (Abschnitt 11).

## Bewusste Ergänzungen gegenüber dem Handoff-Dokument

- `leaders.auth_user_id`: Brücke zu `auth.users`, damit RLS den eingeloggten
  Supabase-Auth-User auf einen `leaders`-Datensatz (und damit eine Rolle)
  abbilden kann. Ohne diese Spalte lässt sich 5.6 nicht in Postgres erzwingen.
- `gemeinden` / `gemeinde_id`: Abschnitt 12, Lücke 6 ("jetzt gemeinde_id
  einplanen, nicht später") — eine Zeile für ELK Basel, alle Top-Level-Tabellen
  tragen die Spalte bereits.
- `gemeinde_einstellungen.risiko_schwellwert`: Abschnitt 5.3 ("Der Schwellwert 3
  sollte pro Gemeinde konfigurierbar sein").
- `contacts.erledigt_am`: Abschnitt 12, Lücke 1 — genau der dort vorgeschlagene
  Lösungsweg für den fehlenden "erledigt"-Zustand der Wiedervorlage.
- `contacts_audit_log`: Abschnitt 11 verlangt ein Audit-Log für Lese- **und**
  Schreibzugriffe auf `contacts`. Schreibzugriffe werden per Trigger erfasst.
  Lesezugriffe lösen in Postgres keinen Trigger aus — dafür braucht es eine
  serverseitige Stelle (z.B. eine Supabase Edge Function als einziger Lesepfad
  für Notizen), die vor jedem `select` auf `contacts.notiz` einen Log-Eintrag
  schreibt. Das ist in dieser Migration bewusst nicht gelöst, siehe TODO in
  `contacts_audit_log`-Kommentar.

## Nach dem Import (Abschnitt 3, "Erste Schritte" Schritt 3)

Für jede Person in `leaders` muss `auth_user_id` auf einen echten Supabase-Auth-
User gesetzt werden (z.B. per Einladungs-Mail), und `email` muss durch die
echte E-Mail-Adresse der Person ersetzt werden — die Seed-Daten in
`0001_schema.sql` verwenden Platzhalter-Adressen (`vorname@example.org`).
