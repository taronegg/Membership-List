-- Kirchen-Mitgliederverwaltung (ELK Basel)
-- Schema aus design_handoff_kirchen_app/README.md, Abschnitt 4.
-- Stammlisten (4.5) werden als pflegbare Tabellen umgesetzt, nicht als Postgres-Enums,
-- weil die Gemeinde neue Gruppen anlegen können soll.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Mandantenfähigkeit vorbereiten (Abschnitt 12, Lücke 6): jetzt gemeinde_id
-- einplanen, auch wenn aktuell nur eine Gemeinde existiert.
-- ---------------------------------------------------------------------------
create table gemeinden (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

insert into gemeinden (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'ELK Basel');

-- ---------------------------------------------------------------------------
-- Rollen & Leiter (4.6)
-- ---------------------------------------------------------------------------
create type rolle as enum ('pfarrer', 'leiter');

create table leaders (
  id uuid primary key default gen_random_uuid(),
  gemeinde_id uuid not null references gemeinden(id) default '00000000-0000-0000-0000-000000000001',
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  rolle rolle not null default 'leiter',
  created_at timestamptz not null default now()
);

comment on column leaders.auth_user_id is
  'Verknüpfung zum Supabase-Auth-User. Rolle ergibt sich aus dem Login (siehe 7.7) und ist in der App nicht umschaltbar.';

-- ---------------------------------------------------------------------------
-- Pflegbare Stammlisten (4.5)
-- ---------------------------------------------------------------------------
create table status_optionen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sortierung int not null default 0
);

create table bacenta_optionen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sortierung int not null default 0
);

create table basonta_optionen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sortierung int not null default 0
);

create table bildung_optionen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sortierung int not null default 0
);

create table bildungsjahr_optionen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sortierung int not null default 0
);

create table wie_entdeckt_optionen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sortierung int not null default 0
);

create table kontaktart_optionen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sortierung int not null default 0
);

insert into status_optionen (name, sortierung) values
  ('Erstbesucher', 1), ('Besucher', 2), ('Member', 3), ('Ehemalig', 4), ('Kontakt', 5);

insert into bacenta_optionen (name, sortierung) values
  ('@home', 1), ('FHNW', 2), ('First Love Club', 3), ('Keine', 4), ('Münchenstein', 5);

insert into basonta_optionen (name, sortierung) values
  ('Airport Stars', 1), ('Dancing Stars', 2), ('Keine', 3), ('Media/ Social Media', 4),
  ('Singing Stars', 5), ('Usher', 6), ('Culinary Stars', 7);

insert into bildung_optionen (name, sortierung) values
  ('10. Klasse', 1), ('Lehre', 2), ('Gymnasium', 3), ('Studium', 4), ('Berufstätig', 5),
  ('Keine Angaben', 6);

insert into bildungsjahr_optionen (name, sortierung) values
  ('1. Jahr', 1), ('2. Jahr', 2), ('3. Jahr', 3), ('4. Jahr', 4), ('Abgeschlossen', 5),
  ('Keine Angaben', 6);

insert into wie_entdeckt_optionen (name, sortierung) values
  ('Persönliche Einladung', 1), ('Freunde oder Familie', 2), ('Social Media', 3),
  ('Event', 4), ('Strasse / Outreach', 5), ('Sonstiges', 6);

insert into kontaktart_optionen (name, sortierung) values
  ('Besuch', 1), ('Beratung / Seelsorge', 2), ('Telefonat', 3),
  ('WhatsApp / Nachricht', 4), ('Treffen / Kaffee', 5), ('Gespräch nach Gottesdienst', 6),
  ('Sonstiges', 7);

insert into leaders (name, email, rolle) values
  ('Abi', 'abi@example.org', 'leiter'), ('Age', 'age@example.org', 'leiter'),
  ('Bethel', 'bethel@example.org', 'leiter'), ('Chloé', 'chloe@example.org', 'leiter'),
  ('Crystal', 'crystal@example.org', 'leiter'), ('Esperance', 'esperance@example.org', 'leiter'),
  ('Feodora', 'feodora@example.org', 'leiter'), ('Jenny', 'jenny@example.org', 'leiter'),
  ('Jonas', 'jonas@example.org', 'leiter'), ('Joyce', 'joyce@example.org', 'leiter'),
  ('Kamilla', 'kamilla@example.org', 'leiter'), ('Manu', 'manu@example.org', 'leiter'),
  ('Noémie', 'noemie@example.org', 'leiter'), ('Thiago', 'thiago@example.org', 'leiter'),
  ('Victor', 'victor@example.org', 'leiter')
on conflict (email) do nothing;

comment on table leaders is
  'E-Mail-Adressen sind Platzhalter aus dem Import und müssen vor dem Produktivgang durch echte Adressen ersetzt werden (siehe import/README.md).';

-- ---------------------------------------------------------------------------
-- Einstellungen pro Gemeinde (Risiko-Schwellwert, 5.3: "sollte pro Gemeinde
-- konfigurierbar sein")
-- ---------------------------------------------------------------------------
create table gemeinde_einstellungen (
  gemeinde_id uuid primary key references gemeinden(id),
  risiko_schwellwert int not null default 3,
  wiedervorlage_bald_faellig_tage int not null default 10
);

insert into gemeinde_einstellungen (gemeinde_id) values ('00000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------------------
-- people (4.1)
-- ---------------------------------------------------------------------------
create sequence people_id_seq;

create table people (
  id text primary key default ('P' || lpad(nextval('people_id_seq')::text, 3, '0')),
  gemeinde_id uuid not null references gemeinden(id) default '00000000-0000-0000-0000-000000000001',
  vorname text not null,
  nachname text not null,
  status_id uuid not null references status_optionen(id),
  zustaendig uuid not null references leaders(id),
  telefon text,
  geburtsdatum date,
  adresse text,
  bacenta_id uuid references bacenta_optionen(id),
  basonta_id uuid references basonta_optionen(id),
  bildung_id uuid references bildung_optionen(id),
  richtung text,
  bildungsjahr_id uuid references bildungsjahr_optionen(id),
  wie_entdeckt_id uuid references wie_entdeckt_optionen(id),
  erstkontakt date,
  besucher1 uuid references leaders(id),
  besucher2 uuid references leaders(id),
  notizen text,
  zu_pruefen boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column people.zustaendig is
  'Der Schlüssel für die Berechtigung (5.6). Pflichtfeld (7.4) — ohne zustaendig fällt die Person aus jeder Leiter-Sicht.';
comment on column people.zu_pruefen is
  'Vorbelegung true bei Neuanlage (7.4) — Schnellerfassung im Gottesdienst wird später nachgepflegt.';

-- name, letzter_besuch, letzte_beratung, letzter_kontakt, tage_seit_kontakt,
-- kontakte_total werden NICHT gespeichert (4.1) -- siehe src/lib/berechnungen.ts.

create index people_zustaendig_idx on people(zustaendig);
create index people_status_idx on people(status_id);

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger people_set_updated_at
  before update on people
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- contacts (4.2)
-- ---------------------------------------------------------------------------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  person_id text not null references people(id) on delete cascade,
  datum date, -- nullable: Altdaten ohne Datum ("Datum bitte nachtragen", 4.2)
  verantwortlich uuid not null references leaders(id),
  art_id uuid not null references kontaktart_optionen(id),
  notiz text,
  naechster_schritt text,
  wiedervorlage date,
  erledigt_am date, -- Lösung für Lücke 12.1: "erledigt"-Zustand für Wiedervorlage
  created_at timestamptz not null default now()
);

create index contacts_person_idx on contacts(person_id);
create index contacts_wiedervorlage_idx on contacts(wiedervorlage) where wiedervorlage is not null;

comment on column contacts.datum is
  'Nullable, weil in den Altdaten oft nicht erfasst (4.2). UI markiert diese Einträge als "Datum fehlt", statt sie zu verwerfen.';
comment on column contacts.erledigt_am is
  'Abschnitt 12, Lücke 1: Ein Wiedervorlage-Eintrag gilt als erledigt, wenn dieses Feld gesetzt ist. Die Fällig-Liste (5.4) filtert darauf.';

-- ---------------------------------------------------------------------------
-- attendance (4.3) -- normalisiert, nicht als Kreuztabelle
-- ---------------------------------------------------------------------------
create type attendance_status as enum ('anwesend', 'abwesend');

create table attendance (
  id uuid primary key default gen_random_uuid(),
  person_id text not null references people(id) on delete cascade,
  datum date not null,
  status attendance_status not null,
  grund text, -- Abwesenheitsgrund (Lücke 12.3), war im Excel ein Zellkommentar
  created_at timestamptz not null default now(),
  unique (person_id, datum)
);

create index attendance_person_idx on attendance(person_id);
create index attendance_datum_idx on attendance(datum);

comment on table attendance is
  'Drei Zustände (4.3): x=anwesend, o=abwesend, KEINE ZEILE=nicht erfasst. '
  'Nicht erfasst darf nie in die Quote einfliessen -- siehe src/lib/berechnungen.ts.';

-- ---------------------------------------------------------------------------
-- events (4.4) -- als event_sessions + event_attendance statt flacher Struktur
-- ---------------------------------------------------------------------------
create table event_sessions (
  id uuid primary key default gen_random_uuid(),
  gemeinde_id uuid not null references gemeinden(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  datum date not null,
  verantwortlich uuid references leaders(id),
  created_at timestamptz not null default now()
);

create index event_sessions_datum_idx on event_sessions(datum);

create table event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_session_id uuid not null references event_sessions(id) on delete cascade,
  person_id text not null references people(id) on delete cascade,
  rolle text,
  anwesend boolean not null default false,
  notiz text,
  unique (event_session_id, person_id)
);

create index event_attendance_person_idx on event_attendance(person_id);
create index event_attendance_session_idx on event_attendance(event_session_id);

-- ---------------------------------------------------------------------------
-- Audit-Log für Zugriffe auf contacts (Abschnitt 11: sensibelster Teil)
-- ---------------------------------------------------------------------------
create table contacts_audit_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid, -- keine FK: Zeile muss auch nach Löschung des Kontakts erhalten bleiben
  person_id text,
  leader_id uuid references leaders(id),
  aktion text not null check (aktion in ('select', 'insert', 'update', 'delete')),
  created_at timestamptz not null default now()
);

comment on table contacts_audit_log is
  'Abschnitt 11: Audit-Log für Lese-/Schreibzugriffe auf contacts. Schreibzugriffe (insert/update/delete) '
  'werden per Trigger protokolliert (0002_rls.sql). Lesezugriffe müssen serverseitig (z.B. Edge Function) '
  'protokolliert werden, da SELECT keine Trigger auslöst -- reines Client-RLS reicht dafür nicht aus.';
