# Handoff: Kirchen-Mitgliederverwaltung (ELK Basel)

> **An Claude Code:** Lies dieses Dokument komplett, bevor du Code schreibst. Es enthält
> alles, was du brauchst — Datenmodell, Rollen, Berechnungslogik, Screens, Design-Tokens
> und die Import-Regeln für die zwei bestehenden Excel-Dateien. Am Ende steht ein
> Abschnitt „Erste Schritte", der die Reihenfolge der Implementierung vorgibt.

---

## 1. Überblick

Eine mobile App (iOS-first, Deutsch), mit der eine Kirchengemeinde ihre Personen,
deren Anwesenheit an Sonntagen und Events, und die pastorale Kontaktpflege
(„Wiedervorlage"-Workflow) verwaltet. Sie ersetzt zwei gewachsene Excel-Dateien.

Zwei Rollen mit unterschiedlichem Umfang:

| Rolle | Sieht |
| --- | --- |
| **Pfarrer** (Gemeindeleitung) | Alle Personen, alle Kontakte, alle Events, plus eine aggregierte **Leiter-Übersicht** |
| **Leiter** (Gruppenleiter) | Nur Personen, bei denen er/sie als `zustaendig` eingetragen ist — inkl. deren Kontakte, Anwesenheit und Events |

Es gibt **keine** Mitglieder-Selbstbedienung. Die App ist ein Werkzeug für Leitende.

---

## 2. Zu den Design-Dateien in diesem Bundle

`Church Membership App.dc.html` ist eine **Design-Referenz, kein Produktionscode.**
Es ist ein HTML-Prototyp, der Aussehen und Verhalten zeigt: Alle Daten stehen als
Konstanten im Kopf der Logik-Klasse, es gibt keine Persistenz, kein Backend, keine
Authentifizierung. Der iPhone-Rahmen (`ios-frame.jsx`) ist nur eine Präsentationshülle
und gehört **nicht** in die App.

Deine Aufgabe: diese Screens in einer echten Umgebung neu bauen (siehe
„Technische Empfehlung"), mit echter Datenhaltung, echten Logins und echten
Berechtigungen. Übernimm Layout, Hierarchie und Interaktionslogik pixelgenau,
aber schreibe idiomatischen Code für die gewählte Plattform.

**Fidelity: high-fidelity.** Farben, Typografie, Abstände und Interaktionen sind final
und bewusst gewählt (Design-System „Modernist"). Alle exakten Werte stehen in
Abschnitt 9.

---

## 3. Technische Empfehlung

Es existiert noch kein Codebase. Empfehlung — begründet, aber ersetzbar:

- **Frontend:** React Native (Expo) oder eine PWA mit React + Vite. Die Nutzer sind
  Leiter mit Android- *und* iPhone-Geräten; eine PWA, die man zum Homescreen
  hinzufügt, ist der schnellste Weg zu echter Nutzung. Wenn App-Store-Präsenz
  gewünscht ist: Expo.
- **Backend/DB:** Supabase (Postgres + Auth + Row Level Security). RLS ist hier der
  entscheidende Punkt: Die Leiter/Pfarrer-Trennung darf **nicht** nur im Client
  gefiltert werden, sondern muss in der Datenbank erzwungen werden.
- **Hosting:** Region EU/Schweiz (siehe Abschnitt 11, Datenschutz).
- **Offline:** Die Anwesenheitserfassung passiert im Gottesdienst, wo WLAN oft fehlt.
  Check-in muss lokal puffern und später synchronisieren. Das ist eine harte
  Anforderung, keine Optimierung.

---

## 4. Datenmodell

Abgeleitet direkt aus den zwei Excel-Dateien. Feldnamen in Klammern = ursprüngliche
Spaltenüberschrift, damit der Import nachvollziehbar bleibt.

### 4.1 `people` (Excel: `1_ELK_Basel_Personen.xlsx`, Blatt „Personen", 25 Spalten)

| Feld | Typ | Excel-Spalte | Anmerkung |
| --- | --- | --- | --- |
| `id` | text, PK | ID | Format `P001`, fortlaufend |
| `vorname` | text | Vorname | |
| `nachname` | text | Nachname | |
| `name` | — | Name | **Nicht speichern** — im Excel eine Formel, in der DB abgeleitet |
| `status` | enum | Status | siehe Listen 4.4 |
| `zustaendig` | FK → `leaders` | Zuständige Person | **Der Schlüssel für die Berechtigung.** Im Excel inkonsistent gross/klein („jenny" vs. „Jenny") — beim Import normalisieren |
| `telefon` | text | Telefon | Gemischte Formate (`0783081703`, `+41782526620`) — beim Import auf E.164 normalisieren, formatiert anzeigen |
| `letzter_besuch` | — | Letzter Besuch | **Nicht speichern** — abgeleitet, siehe 5.2 |
| `letzte_beratung` | — | Letzte Beratung | **Nicht speichern** — abgeleitet, siehe 5.2 |
| `letzter_kontakt` | — | Letzter Kontakt | **Nicht speichern** — abgeleitet, siehe 5.2 |
| `tage_seit_kontakt` | — | Tage seit Kontakt | **Nicht speichern** — abgeleitet, siehe 5.2 |
| `kontakte_total` | — | Kontakte total | **Nicht speichern** — abgeleitet, siehe 5.2 |
| `geburtsdatum` | date | Geburtsdatum | Im Excel Serienzahl (Basis 1899-12-30) |
| `adresse` | text | Adresse | Freitext, oft „Keine Angaben" |
| `bacenta` | enum | Bacenta | Geografische/Lebensphasen-Gruppe |
| `basonta` | enum | Basonta | Dienst-/Ministry-Gruppe |
| `bildung` | enum | Bildung | |
| `richtung` | text | Richtung | Freitext (Fachrichtung) |
| `bildungsjahr` | enum | Bildungsjahr | |
| `wie_entdeckt` | enum | Wie entdeckt | |
| `erstkontakt` | date | Erstkontakt | |
| `besucher1` | FK → `leaders`, nullable | Besucher 1 | Wer die Person besucht/begleitet |
| `besucher2` | FK → `leaders`, nullable | Besucher 2 | |
| `notizen` | text | Notizen | Freitext, mehrzeilig |
| `zu_pruefen` | boolean | Zu prüfen | Flag für unvollständige/unbestätigte Angaben |

### 4.2 `contacts` (Excel: gleiche Datei, Blatt „Kontakte", 7 Spalten)

| Feld | Typ | Excel-Spalte |
| --- | --- | --- |
| `id` | uuid, PK | — |
| `person_id` | FK → `people` | Name (im Excel per Namens-Lookup, hier echte Relation) |
| `datum` | date | Datum |
| `verantwortlich` | FK → `leaders` | Verantwortlich |
| `art` | enum | Art |
| `notiz` | text | Notiz / Inhalt |
| `naechster_schritt` | text, nullable | Nächster Schritt |
| `wiedervorlage` | date, nullable | Wiedervorlage bis |

**Wichtig:** In den Altdaten fehlt bei vielen Zeilen das Datum (Vermerk
„übernommen aus Event-Kontakte, Datum bitte nachtragen"). Der Import muss
`datum = null` zulassen und diese Einträge in der UI als „Datum fehlt" markieren,
nicht wegwerfen.

### 4.3 Anwesenheit (Excel: `2_ELK_Basel_Anwesenheit.xlsx`)

Das Excel-Blatt „Anwesenheit" ist eine Kreuztabelle: Zeilen = Personen,
Spalten = alle Sonntage des Jahres, Zellwert `x` / `o` / leer.
**In der DB normalisieren, nicht als Kreuztabelle nachbauen:**

`attendance`

| Feld | Typ | Anmerkung |
| --- | --- | --- |
| `id` | uuid, PK | |
| `person_id` | FK → `people` | |
| `datum` | date | Der Sonntag |
| `status` | enum `anwesend` \| `abwesend` | |
| `grund` | text, nullable | Im Excel als **Zellkommentar** hinterlegt („Grund für eine Abwesenheit als Kommentar in die Zelle schreiben") — wird hier ein echtes Feld |

Unique constraint auf `(person_id, datum)`.
**Drei Zustände, nicht zwei:** `x` = anwesend, `o` = abwesend, **leer = nicht erfasst**.
Nicht erfasst heisst *keine Zeile* — es ist ausdrücklich nicht dasselbe wie abwesend
und darf nie in die Quote einfliessen.

Das Blatt „Auswertung" (Name, Verantwortliche, Anwesend, Abwesend, Erfasst, Quote,
Letzte Anwesenheit, Abwesend in Folge) ist **komplett abgeleitet** — nicht importieren,
sondern berechnen (siehe 5.1).

### 4.4 `events` (Excel: gleiche Datei, Blatt „Events", 7 Spalten)

| Feld | Typ | Excel-Spalte |
| --- | --- | --- |
| `id` | uuid, PK | — |
| `event` | text | Event |
| `datum` | date | Datum |
| `person_id` | FK → `people` | Person |
| `verantwortlich` | FK → `leaders` | Verantwortlich |
| `rolle` | text, nullable | Rolle / Gruppe |
| `anwesend` | boolean | Anwesend |
| `notiz` | text, nullable | Notiz |

Eine „Event-Session" ist im Prototyp die Gruppierung `(event, datum)`. Sauberer für
die App: eine eigene Tabelle `event_sessions (id, name, datum, verantwortlich)` und
`event_attendance` als Zeilen darauf. Migriere die flache Excel-Struktur dorthin.

### 4.5 Stammlisten (Excel: gleiche Datei, verstecktes Blatt „Listen")

Diese Werte sind die Dropdown-Quellen. Als Enums oder als eigene, pflegbare Tabellen
umsetzen — die Gemeinde legt hier neue Gruppen an, also besser pflegbar als hart kodiert.

- **Status:** Erstbesucher, Besucher, Member, Ehemalig, Kontakt
- **Bacenta:** @home, FHNW, First Love Club, Keine, Münchenstein
- **Basonta:** Airport Stars, Dancing Stars, Keine, Media/ Social Media, Singing Stars, Usher, Culinary Stars
- **Kontaktart:** Besuch, Beratung / Seelsorge, Telefonat, WhatsApp / Nachricht, Treffen / Kaffee, Gespräch nach Gottesdienst, Sonstiges
- **Verantwortliche:** Abi, Age, Bethel, Chloé, Crystal, Esperance, Feodora, Jenny, Jonas, Joyce, Kamilla, Manu, Noémie, Thiago, Victor

Zusätzlich im Prototyp verwendet (im Excel Freitext, hier als Liste sinnvoll):
- **Bildung:** 10. Klasse, Lehre, Gymnasium, Studium, Berufstätig, Keine Angaben
- **Bildungsjahr:** 1. Jahr, 2. Jahr, 3. Jahr, 4. Jahr, Abgeschlossen, Keine Angaben
- **Wie entdeckt:** Persönliche Einladung, Freunde oder Familie, Social Media, Event, Strasse / Outreach, Sonstiges

### 4.6 `leaders` / Auth

| Feld | Typ |
| --- | --- |
| `id` | uuid, PK |
| `name` | text (der Anzeigename, wie in „Verantwortliche") |
| `email` | text, unique |
| `rolle` | enum `pfarrer` \| `leiter` |

`people.zustaendig`, `contacts.verantwortlich`, `people.besucher1/2` und
`events.verantwortlich` zeigen alle hierauf.

---

## 5. Berechnungslogik (verbindlich)

Diese Regeln sind der eigentliche Wert der App. Der Prototyp implementiert sie in
`attendanceOf()` und `decorate()` — übernimm sie exakt.

### 5.1 Anwesenheitskennzahlen (pro Person)

Aus allen `attendance`-Zeilen der Person:

- `anwesend` = Anzahl Zeilen mit Status `anwesend`
- `abwesend` = Anzahl Zeilen mit Status `abwesend`
- `erfasst` = `anwesend + abwesend` (nicht erfasste Sonntage zählen **nicht**)
- `quote` = `erfasst > 0 ? anwesend / erfasst : null` — bei `null` in der UI „—" zeigen, **nicht** 0 %
- `abwesend_in_folge` = Anzahl aufeinanderfolgender `abwesend` **am Ende** der
  chronologischen Reihe. Zählung bricht beim ersten `anwesend` ab.
  **Nicht erfasste Sonntage brechen die Serie nicht ab** — sie werden übersprungen.
- `letzte_anwesenheit` = grösstes `datum` mit Status `anwesend`, sonst `null`

### 5.2 Kontaktkennzahlen (pro Person, aus `contacts`)

- `kontakte_total` = Anzahl Kontakteinträge
- `letzter_kontakt` = grösstes `datum`
- `tage_seit_kontakt` = `heute − letzter_kontakt` in Tagen, `null` wenn kein Kontakt
- `letzter_besuch` = grösstes `datum` mit `art = 'Besuch'`
- `letzte_beratung` = grösstes `datum` mit `art = 'Beratung / Seelsorge'`

Alle fünf sind **abgeleitet**. Sie dürfen nicht per Hand editierbar sein — genau
dieses Doppelpflegen ist das Problem der Excel-Lösung.

### 5.3 Risiko-Definition

Eine Person gilt als **Risiko-Kontakt**, wenn:
`abwesend_in_folge >= 3` **und** `status ∈ {Member, Besucher, Erstbesucher, Kontakt}`.

Status `Ehemalig` ist ausgeschlossen — sonst füllt sich die Liste dauerhaft mit
Personen, die die Gemeinde bewusst verlassen haben.
Der Schwellwert 3 sollte pro Gemeinde konfigurierbar sein.

### 5.4 Wiedervorlage („fällig")

Ein Kontakteintrag ist **fällig**, wenn `wiedervorlage IS NOT NULL` und
`wiedervorlage <= heute`. Sortierung aufsteigend (ältestes zuerst).
Die Home-Liste im Prototyp zeigt zusätzlich bald fällige (bis +10 Tage) mit
andersfarbigem Chip — überfällig = roter Chip mit weisser Schrift, bald fällig =
heller Chip.

Es fehlt bewusst noch: ein „erledigt"-Zustand. Siehe Abschnitt 12.

### 5.5 Aktive Personen

`status ∈ {Member, Besucher, Erstbesucher, Kontakt}`. Diese Menge ist die Basis für
Ø-Quote, Risiko-Zählung und die Check-in-Liste. `Ehemalig` erscheint in der
Personenliste (filterbar), aber nicht in Kennzahlen und nicht im Check-in.

### 5.6 Sichtbarkeit (RLS)

- **Pfarrer:** alle Zeilen aller Tabellen.
- **Leiter:** nur `people` mit `zustaendig = eigener Name`; `contacts`, `attendance`
  und `events` nur für diese Personen.

In Postgres als RLS-Policy formulieren, nicht als Client-Filter.

---

## 6. Navigation

Fünf Tabs unten (Tab-Bar 2px Oberkante, `padding-bottom: 20px` für die Home-Indicator-Zone):

1. **Übersicht** (Home)
2. **Personen**
3. **Anwesenheit**
4. **Kontakte**
5. **Profil**

Darüber Detail-/Formular-Screens, die die Tab-Bar **ersetzen** und stattdessen einen
Zurück-Chevron links im Header zeigen. Header-Höhe: `padding: 10px 16px 12px`,
`min-height: 34px`, 2px Unterkante.

Screen-Stack:
```
Tab
 └─ Personen-Detail  (Sub-Tabs: Profil | Anwesenheit | Kontakte)
     ├─ Person bearbeiten   (Stift-Icon oben rechts)
     └─ Kontakt erfassen    (Button im Sub-Tab „Kontakte")
Personen-Liste
 └─ Neue Person             (+-Icon oben rechts, roter Kasten)
```

---

## 7. Screens im Detail

### 7.1 Übersicht (Home)

**Zweck:** Der Tagesstart. Was ist zu tun, wer fällt durch.

Von oben nach unten:

1. **Begrüssung** — Kicker mit Wochentag + Datum (11px, uppercase, `letter-spacing: .08em`, `#7d7979`), darunter „Guten Tag, {Name}" (25px, weight 800).
2. **Kennzahlen-Raster** — 3×2 Zellen, 1px Gitterlinien (`rgba(32,30,29,.4)` als Hintergrund des Grids, Zellen `#eae9e9`, `gap: 1px`). Pro Zelle: Label (9px, uppercase, `#ec3013`) über Wert (22px, weight 800).
   Werte: `Personen`, `Ø Quote`, `Risiko`, `Wiedervorlage`, `Zu prüfen`, `Erstbesucher`.
3. **Zwei Aktionen** — „Anwesenheit erfassen" (roter Vollflächen-Button) und
   „Person hinzufügen" (Outline). Labels **linksbündig**, nicht zentriert.
4. **Leiter-Übersicht** — *nur Rolle Pfarrer.* Pro Leiter eine Zeile: Initiale im
   Kasten, Name, Meta „N Personen · Ø X% · N Kontakte" (Singular/Plural korrekt!),
   rechts roter Badge „N Risiko" falls > 0. Tap → Personenliste, vorgefiltert auf
   diesen Leiter.
5. **Risiko-Kontakte** — Zeilen mit Initialen-Kasten (dunkel), Name, „Bacenta ·
   Zuständig", rechts Badge „N× WEG" auf `#ae1800`. Sortiert nach Serie absteigend.
6. **Wiedervorlage fällig** — Name, darunter der nächste Schritt, rechts Datums-Chip.
7. **Geburtstage im Monat** — Name, „wird N", rechts Datum in `#ec3013`.

Jeder Abschnitt hat eine Kopfzeile: Lucide-Icon in `#ec3013` (15px) + Titel
(13px, weight 800, uppercase, `letter-spacing: .04em`), darunter 2px Trennlinie.
Leere Abschnitte zeigen einen grauen Satz („Keine Risiko-Kontakte aktuell."), nicht nichts.

### 7.2 Personen (Liste)

- **Suchfeld** — Hintergrund `#eae9e9`, 1px Rahmen, Lupe links. Sucht über Name,
  Bacenta und Basonta.
- **Drei Filterreihen**, horizontal scrollbar, jede mit 9px-uppercase-Label darüber:
  *Zuständige Person* (nur Pfarrer, aktiver Chip dunkel `#201e1d`),
  *Status* (aktiver Chip rot `#ec3013`), *Bacenta* (aktiver Chip dunkel).
  Jede Reihe beginnt mit „Alle".
- **Zählzeile** — „N von M Personen" links, „Filter zurücksetzen" rechts (`#ae1800`).
- **Personenzeilen** — Initialen-Kasten 34px (dunkel, weisse Schrift), Name
  (14px/600) mit rotem Warndreieck-Icon falls `zu_pruefen`, Meta „Bacenta ·
  Zuständig · Quote", rechts Status-Chip (Farben in 9.2), dann Chevron.
  Sortiert alphabetisch nach Name (Locale `de`).

### 7.3 Personen-Detail

Kopf: Initialen-Kasten 56px, Name (19px/800), Person-ID (11px, grau), darunter
Chip-Reihe (Status + Bacenta). Bei `zu_pruefen` ein Warnbanner darunter:
Hintergrund `#fff2ef`, 1px Rahmen `#ec3013`, Text `#7c1405`,
„Zu prüfen — Angaben unvollständig oder unbestätigt".

Drei Sub-Tabs in einem 1px-Rahmen, aktiver Tab `#201e1d` mit `#f3f2f2`-Schrift:

**Sub-Tab „Profil"** — fünf Feldgruppen, jede mit 10px-uppercase-Überschrift und 2px
Unterlinie. Zeilen: Label links (11px grau, feste Breite 118px), Wert rechts
(13px/600). Leere Werte als „—".
- *Stammdaten:* Name, Status, Telefon, Geburtsdatum (+ Alter in Klammern), Adresse
- *Gemeinde:* Zuständige Person, Bacenta, Basonta
- *Bildung:* Bildung, Richtung, Bildungsjahr
- *Herkunft & Betreuung:* Wie entdeckt, Erstkontakt, Besucher 1, Besucher 2
- *Kontaktverlauf:* Letzter Kontakt, Tage seit Kontakt, Kontakte total, Letzter
  Besuch, Letzte Beratung — **alle abgeleitet, nicht editierbar**
- Darunter *Notizen* als Fliesstext (13px, `line-height: 1.55`), nur wenn vorhanden

**Sub-Tab „Anwesenheit"** —
- 3×2-Kennzahlenraster: Quote, Anwesend, Abwesend, Erfasst, Abw. in Folge, Letzte Anw.
- **Sonntags-Streifen:** die letzten 12 Sonntage als gleich breite Balken, 34px hoch,
  3px Abstand. Anwesend = `#201e1d`, abwesend = `#ec3013`, nicht erfasst = `#eae9e9`
  mit 1px Rahmen. Darunter erstes/letztes Datum und eine dreiteilige Legende.
- **Einzeltermine:** Liste, neueste zuerst, Datum links, Status-Chip rechts
  („anwesend" / „abwesend" / „nicht erfasst").
- **Events:** pro Eintrag Name, Chip anwesend/abwesend, Meta „Datum · Verantwortlich
  · Rolle · Notiz".

**Sub-Tab „Kontakte"** —
- 3er-Kennzahlenraster: Kontakte, Tage seit, Letzter
- Roter Button „Kontakt erfassen"
- Einträge: Datum (12px/800) + Art-Chip in einer Zeile, darunter die Notiz
  (13px, `line-height: 1.5`), darunter — falls vorhanden — der nächste Schritt mit
  Pfeil-Icon in `#ec3013` und Text `#7c1405`, zuletzt Fusszeile
  „Verantwortlich · Wiedervorlage TT. Mon".

### 7.4 Person anlegen / bearbeiten

Alle Felder aus 4.1, gruppiert wie im Profil-Sub-Tab. Feldtypen:
- Text: `min-height: 40px`, Hintergrund `#eae9e9`, 1px Rahmen, **kein** Border-Radius
- Select: dieselbe Optik, Optionen aus den Listen in 4.5
- Textarea (Notizen): `min-height: 76px`, vertikal resizable
- **„Zu prüfen markieren"** als Checkbox-Zeile: 18px Kasten mit 2px Rahmen, gefüllt
  `#201e1d` mit weissem Häkchen wenn aktiv
- Unten „Speichern" (rot) und „Abbrechen" (Outline), gleich breit

Neue Personen erhalten `zu_pruefen = true` als Vorbelegung — bewusst, damit
Schnellerfassung im Gottesdienst später nachgepflegt wird.

**Validierung (im Prototyp noch nicht umgesetzt, hier verbindlich):** Vorname und
Nachname sind Pflicht; `zustaendig` ist Pflicht (sonst fällt die Person aus jeder
Leiter-Sicht heraus); Telefon auf plausible CH-Nummer prüfen, aber nicht erzwingen;
Datumsfelder als echte Date-Picker, nicht als Freitext (der Prototyp nutzt
`YYYY-MM-DD`-Textfelder — das ist eine Prototyp-Abkürzung).

### 7.5 Anwesenheit (Tab)

Zwei Sub-Tabs: **Sonntag** und **Events**.

**Sonntag** — Datumszeile, dann 3er-Raster Anwesend/Abwesend/Offen, dann der Hinweis
„x = anwesend, o = abwesend, leer = nicht erfasst", dann pro aktive Person eine Zeile
mit Dreifach-Umschalter: `x` (aktiv dunkel), `o` (aktiv rot), `–` (aktiv `#eae9e9`).
Buttons je 34px breit in einem gemeinsamen 1px-Rahmen. Unten „Anwesenheit speichern",
danach kurz „Gespeichert ✓" (2s, Fade).

Der Dreifach-Zustand ist wesentlich: Der Prototyp startet **ohne** Vorauswahl, damit
niemand versehentlich alle als anwesend speichert.

**Events** — Liste der Event-Sessions, aufklappbar. Zeile: Name, „Datum ·
Verantwortliche", Chip „anwesend/gesamt", Chevron (dreht 180° beim Aufklappen).
Aufgeklappt: pro Teilnehmer Name, „Rolle · Verantwortlich · Notiz", Status-Chip.

Fehlt noch: das **Anlegen** eines Events. Siehe Abschnitt 12.

### 7.6 Kontakte (Tab)

Drei Sub-Tabs: **Fällig** (Wiedervorlage ≤ Grenze), **Offene Schritte**
(`naechster_schritt` gesetzt), **Alle**. Darunter „N Einträge".
Zeilen: Name (14px/700) + Chip rechts (überfällig = rot/weiss, bald = `#f7d9d3`,
sonst die Kontaktart auf `#eae7e7`), darunter die Notiz, darunter Fusszeile
„Datum · Art · Verantwortlich · Nächster Schritt". Tap → Personen-Detail.

### 7.7 Profil

Avatar 52px in `#ec3013`, Name, Untertitel („Gemeindeleitung · Zugriff auf alle Daten"
bzw. „Gruppenleiter · eigene Personen").

**Achtung:** Der Rollen-Umschalter und die Leiter-Auswahl im Prototyp sind reine
**Demo-Werkzeuge**, damit man beide Sichten vorführen kann. In der echten App
ergibt sich die Rolle aus dem Login und darf **nicht** umschaltbar sein.

Darunter „Datenquellen" (Verweis auf die zwei Excel-Dateien — in der echten App
sinnvoll ersetzt durch einen Import-/Export-Bereich), dann „Benachrichtigungen"
und „Abmelden" (`#ae1800`).

---

## 8. Interaktionen & Verhalten

- **Navigation:** Tab-Wechsel setzt den Screen-Stack zurück (`screen = null`).
  Zurück-Chevron führt vom Detail auf den Tab, vom Formular auf das Detail.
- **Speichern Person (neu):** springt auf den Personen-Tab, damit man den neuen
  Eintrag in der Liste sieht.
- **Speichern Person (bearbeiten):** kehrt ins Detail zurück.
- **Speichern Kontakt:** kehrt ins Detail zurück, Sub-Tab „Kontakte" aktiv.
- **Leiter-Zeile antippen:** wechselt in die Personenliste und setzt den
  Zuständigkeits-Filter — alle anderen Filter werden zurückgesetzt.
- **Bestätigung:** „Gespeichert ✓" erscheint 2s mit Keyframe-Fade
  (`0% opacity 0 / translateY(6px)` → `15% opacity 1 / translateY(0)` → `85%` halten →
  `100% opacity 0`).
- **Fokus:** `:focus-visible { outline: 2px solid #ec3013; outline-offset: 2px }` —
  nie der Browser-Standard.
- **Hit-Targets:** minimum 44px. Die Check-in-Buttons sind 34px breit, aber die
  Zeilenhöhe trägt die Höhe — in der echten App auf 44px aufziehen.
- **Fehlende Zustände (im Prototyp nicht vorhanden, in der App nötig):**
  Ladezustände pro Liste, Fehlerzustand bei Sync-Fehlschlag, Offline-Banner,
  Leerzustand für „noch keine Personen" beim ersten Start.

---

## 9. Design-Tokens

Design-System: **Modernist** — flach, architektonisch, keine Rundungen,
sichtbares Raster, starke 2px-Linien, Rot sparsam als Akzent.
Vollständige Definition: `_ds/modernist-.../styles.css` (Variablen unter `:root`).

### 9.1 Farben

| Rolle | Wert |
| --- | --- |
| Hintergrund | `#f3f2f2` |
| Flächen / Zellen | `#eae9e9` |
| Text | `#201e1d` |
| Text sekundär | `#605d5d` |
| Text tertiär / Meta | `#7d7979` |
| Chevron / sehr hell | `#bab6b6` |
| Akzent (Rot) | `#ec3013` |
| Akzent dunkel (Warnung, Badge) | `#ae1800` |
| Akzent sehr dunkel (Text auf Tint) | `#7c1405` |
| Akzent-Tint (Hintergrund) | `#fff2ef` |
| Akzent-Tint 2 | `#f7d9d3` |
| Neutral-Chip | `#eae7e7` / Text `#444141` |
| Trennlinie | `rgba(32,30,29,0.4)` |

**Regel:** Rot nie für Fliesstext in Absatzgrösse — dafür `#7c1405`.
Rot ist für den primären Button, kleine Akzente und Warnbadges.

### 9.2 Status-Chips

| Status | Hintergrund | Text |
| --- | --- | --- |
| Member | `#eae7e7` | `#444141` |
| Besucher | `#fff2ef` | `#ae1800` |
| Erstbesucher | `#ec3013` | `#f3f2f2` |
| Kontakt | `#f7d9d3` | `#7c1405` |
| Ehemalig | `#eae7e7` | `#7d7979` |

### 9.3 Typografie

**Archivo** durchgehend (Google Fonts, Gewichte 400 / 600 / 800).

| Verwendung | Grösse | Gewicht |
| --- | --- | --- |
| Begrüssung | 25px | 800 |
| Header-Titel | 20px | 800 |
| Personen-Name (Detail) | 19px | 800 |
| Kennzahl gross | 22px | 800 |
| Kennzahl klein | 16–18px | 800 |
| Listen-Name | 14px | 600 |
| Fliesstext / Feldwert | 13px | 400–600 |
| Abschnittstitel | 13px | 800, uppercase, `.04em` |
| Gruppentitel | 10px | 800, uppercase, `.07em` |
| Label / Meta | 11px | 400 |
| Kennzahl-Label | 9px | 400, uppercase, `.06–.07em` |
| Chip | 10px | 700 |
| Tab-Label | 9px | 700 |

Fliesstext mit `text-wrap: pretty`.

### 9.4 Geometrie

- **Border-Radius: 0px überall.** Keine Ausnahme.
- Rahmen: 1px `rgba(32,30,29,0.4)`; Trennung von Bereichen: 2px derselbe Wert
- Raster: 1px Gitter, erzeugt durch `gap: 1px` auf dunklem Container-Hintergrund
- Abstände: 16px Screen-Padding, Abschnittsabstand 18–22px, Listenzeilen 9–12px vertikal
- Keine Schatten in diesen Screens (das System hat `--shadow-sm/md/lg`, hier
  ungenutzt — nichts schwebt)
- Alles linksbündig, auch Button-Labels

### 9.5 Icons

**Lucide.** Verwendet: home, users, calendar-check, message-square, user,
chevron-left, chevron-right, chevron-down, plus, pencil, search, phone, map-pin,
cake, alert-triangle, alert-circle, clock, arrow-right, bell, log-out, file-text.
Strichstärke 2–2.5, Grösse 12–21px je Kontext.

---

## 10. Excel-Import

Einmaliger Import, danach ist die App die Quelle der Wahrheit.

Reihenfolge und Fallstricke:

1. **Listen** zuerst (Blatt „Listen") → füllt die Enum-/Stammtabellen.
2. **Leiter** aus der Spalte „Verantwortliche" der Listen → `leaders`.
   **Namen normalisieren** („jenny" → „Jenny"). Ohne diesen Schritt bricht die
   Zuständigkeits-Verknüpfung.
3. **Personen** (Blatt „Personen", Zeilen 2–172). Die abgeleiteten Spalten
   (Letzter Besuch, Letzte Beratung, Letzter Kontakt, Tage seit Kontakt,
   Kontakte total, Name) **überspringen**.
   Datumsfelder sind Excel-Serienzahlen, Basis **1899-12-30**
   (`date = 1899-12-30 + n Tage`).
4. **Kontakte** (Blatt „Kontakte"). Verknüpfung erfolgt im Excel über den Namen —
   auf `person_id` auflösen. Nicht auflösbare Namen in einen Fehlerbericht schreiben,
   nicht stillschweigend verwerfen. Fehlende Daten als `null` zulassen.
5. **Anwesenheit** (Blatt „Anwesenheit"): Kreuztabelle auflösen. Kopfzeile ab Spalte C
   enthält die Sonntage als Serienzahlen. Pro Zelle: `x` → Zeile `anwesend`,
   `o` → Zeile `abwesend`, **leer → keine Zeile**. Zellkommentare als `grund`
   übernehmen, falls die Import-Bibliothek sie liefert.
6. **Events** (Blatt „Events") → `event_sessions` + `event_attendance`.
7. **Auswertung** ignorieren — wird berechnet. Nach dem Import einmal gegenrechnen:
   Die berechneten Quoten müssen den Excel-Werten entsprechen. Das ist der beste
   Test, dass der Import korrekt ist.

Bibliothek: `SheetJS` / `openpyxl`, je nach Backend-Sprache.

---

## 11. Datenschutz (nicht optional)

Die App verarbeitet besonders schützenswerte Personendaten nach Schweizer DSG:
Namen, Telefonnummern, Adressen, Geburtsdaten **von Minderjährigen**, plus
seelsorgerliche Notizen über persönliche und familiäre Situationen.

Mindestanforderungen an die Implementierung:

- Hosting und Datenbank in der Schweiz oder EU
- Verschlüsselung im Transit (TLS) und at rest
- Zugriff strikt per RLS, nicht per Client-Filter (siehe 5.6)
- Audit-Log für Lese- und Schreibzugriffe auf `contacts` (die Notizen sind der
  sensibelste Teil)
- Löschkonzept: eine Person muss vollständig löschbar sein, inklusive ihrer
  Kontakteinträge und Anwesenheitszeilen
- Export der eigenen Daten auf Anfrage
- Kein Drittanbieter-Tracking, keine Analytics auf Personendaten

Das ist eine Anforderung an das Produkt, nicht eine Empfehlung. Vor dem
Produktivgang braucht die Gemeinde ein Bearbeitungsverzeichnis und eine
Einwilligung für die Notizen.

---

## 12. Bewusste Lücken

Diese Punkte sind im Prototyp **nicht** gelöst und brauchen eine Entscheidung,
bevor du sie erfindest:

1. **Wiedervorlage abschliessen.** Es gibt kein „erledigt". Aktuell verschwindet
   ein Eintrag nur, wenn man das Datum ändert. Vorschlag: `erledigt_am` auf
   `contacts`, und die Fällig-Liste filtert darauf.
2. **Event anlegen.** Events sind nur lesbar. Es fehlt das Erfassen einer neuen
   Session inkl. Teilnehmerliste.
3. **Abwesenheitsgrund.** Im Excel ein Zellkommentar, im Datenmodell als `grund`
   vorgesehen, in der UI noch nirgends eingebbar. Sinnvoll direkt im Check-in.
4. **Personen zusammenführen.** Bei 172 Personen und Schnellerfassung entstehen
   Duplikate. Es gibt keine Merge-Funktion.
5. **Historie von Statuswechseln.** „Erstbesucher → Besucher → Member" ist der
   eigentliche Weg, den die Gemeinde begleitet — aktuell wird nur der Endzustand
   gespeichert, nicht wann er sich geändert hat. Das wäre die wertvollste
   Erweiterung über Excel hinaus.
6. **Mehrere Gemeinden.** Alles ist implizit auf ELK Basel bezogen. Falls Mandanten
   nötig werden, jetzt `gemeinde_id` einplanen, nicht später.

---

## 13. Erste Schritte (empfohlene Reihenfolge)

1. Datenbankschema aus Abschnitt 4 anlegen, inkl. RLS-Policies aus 5.6.
2. Import-Skript aus Abschnitt 10 schreiben und gegen die Excel-Auswertung verifizieren.
3. Auth + die zwei Rollen.
4. Personenliste und Personen-Detail (Sub-Tab „Profil") — der Kern.
5. Berechnungslogik aus Abschnitt 5 als getestete Funktionen. **Schreibe hier Tests**;
   `abwesend_in_folge` und die Behandlung nicht erfasster Sonntage sind die
   fehleranfälligsten Stellen der ganzen App.
6. Check-in inkl. Offline-Puffer.
7. Kontakte + Wiedervorlage.
8. Übersicht (aggregiert alles Vorherige — deshalb zuletzt, nicht zuerst).
9. Events.

---

## 14. Dateien in diesem Bundle

| Datei | Inhalt |
| --- | --- |
| `Church Membership App.dc.html` | Der Prototyp. Alle Screens, alle Interaktionen. Beispieldaten und Berechnungslogik stehen in der Logik-Klasse am Ende der Datei (`attendanceOf`, `decorate`, `buildSelected`, `renderVals`). |
| `ios-frame.jsx` | Nur der iPhone-Rahmen zur Präsentation. **Nicht übernehmen.** |
| `support.js` | Laufzeit des Prototyp-Formats. **Nicht übernehmen.** |
| `modernist-styles.css` | Das Design-System als Referenz: alle Tokens als CSS-Variablen unter `:root`. |
| `modernist-readme.md` | Die Design-System-Regeln in Worten (Do/Don't, Komponenten, Interaktionszustände). |
| `uploads/` | Die zwei Original-Excel-Dateien als Import-Quelle und Referenz. |

Zum Ansehen des Prototyps: `Church Membership App.dc.html` im Browser öffnen
(die drei Dateien müssen im selben Ordner liegen).
