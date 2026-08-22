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

## PWA / "Zum Home-Bildschirm hinzufügen"

`public/manifest.webmanifest` + `public/icons/` machen die App auf dem
Startbildschirm installierbar (Android: automatischer Installations-Hinweis;
iOS: Teilen → "Zum Home-Bildschirm"). Die Icons sind ein einfaches, mit dem
Design-System konsistentes Monogramm (rot `#ec3013`, Archivo 800) und liegen
als PNG unter `public/icons/`, weil Manifest-Icons plattformübergreifend
zuverlässiger als SVG sind.

Bei einem Marken-/Farbwechsel neu erzeugen:

```bash
node scripts/generate-icons.mjs   # schreibt public/icons/*.png neu
```

Passt dafür `scripts/icon-template.html` an (Hintergrundfarbe, Buchstabe/Mark).

## Tests

```bash
npm run test
```
