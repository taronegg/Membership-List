# App (React + Vite PWA)

Frontend für die Kirchen-Mitgliederverwaltung, siehe
`design_handoff_kirchen_app/README.md` für Datenmodell, Screens und
Design-Tokens. Setzt Abschnitt 3 ("PWA mit React + Vite ... schnellster Weg
zu echter Nutzung") und Abschnitt 13 ("Erste Schritte") um.

## Setup

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY eintragen
npm run dev
```

Braucht eine Supabase-Instanz mit den Migrationen aus `../supabase/migrations`
und mindestens einen `leaders`-Datensatz mit gesetztem `auth_user_id` (siehe
`../supabase/README.md`), sonst zeigt die App nach dem Login "Kein
Leiter-Konto gefunden".

## Struktur

- `src/lib/` — Supabase-Client, geteilte Domain-Typen.
- `src/auth/` — Login + Rollenauflösung (`leaders.rolle` aus dem Login,
  Abschnitt 7.7: nicht umschaltbar).
- `../shared/` (per `@shared/*`-Alias) — Berechnungslogik aus Abschnitt 5,
  gemeinsam mit `../import` genutzt.

## Tests

```bash
npm run test
```
