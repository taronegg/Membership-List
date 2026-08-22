-- Row Level Security (Abschnitt 5.6 + 11).
-- "In Postgres als RLS-Policy formulieren, nicht als Client-Filter."
--
-- Pfarrer: alle Zeilen aller Tabellen.
-- Leiter: nur people mit zustaendig = eigener Person; contacts/attendance/events
-- nur für diese Personen.

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen (security definer, damit sie die leaders-Tabelle lesen
-- dürfen, ohne die RLS-Policy auf leaders rekursiv erneut auszuwerten)
-- ---------------------------------------------------------------------------
create or replace function current_leader_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from leaders where auth_user_id = auth.uid();
$$;

create or replace function current_leader_rolle() returns rolle
language sql stable security definer set search_path = public as $$
  select rolle from leaders where auth_user_id = auth.uid();
$$;

create or replace function is_pfarrer() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_leader_rolle() = 'pfarrer', false);
$$;

create or replace function is_authenticated_leader() returns boolean
language sql stable security definer set search_path = public as $$
  select current_leader_id() is not null;
$$;

create or replace function owns_person(p_person_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from people where id = p_person_id and zustaendig = current_leader_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- leaders: Verzeichnis für alle eingeloggten Leiter lesbar (wird für Filter,
-- "Verantwortlich"-Anzeige und Dropdowns überall gebraucht). Anlegen/Ändern/
-- Löschen von Leiter-Konten ist Gemeindeleitungs-Sache.
-- ---------------------------------------------------------------------------
alter table leaders enable row level security;

create policy leaders_select on leaders
  for select using (is_authenticated_leader());

create policy leaders_write on leaders
  for all using (is_pfarrer()) with check (is_pfarrer());

-- ---------------------------------------------------------------------------
-- Stammlisten & Einstellungen: für alle Leiter lesbar, nur Pfarrer pflegt sie.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'gemeinden', 'status_optionen', 'bacenta_optionen', 'basonta_optionen',
    'bildung_optionen', 'bildungsjahr_optionen', 'wie_entdeckt_optionen',
    'kontaktart_optionen', 'gemeinde_einstellungen'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I_select on %I for select using (is_authenticated_leader())', t, t
    );
    execute format(
      'create policy %I_write on %I for all using (is_pfarrer()) with check (is_pfarrer())', t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- people (5.6: Kern der Berechtigung)
-- ---------------------------------------------------------------------------
alter table people enable row level security;

create policy people_select on people
  for select using (is_pfarrer() or zustaendig = current_leader_id());

create policy people_insert on people
  for insert with check (is_pfarrer() or zustaendig = current_leader_id());

create policy people_update on people
  for update using (is_pfarrer() or zustaendig = current_leader_id())
  with check (is_pfarrer() or zustaendig = current_leader_id());

-- Löschkonzept (Abschnitt 11): vollständiges Löschen einer Person bleibt der
-- Gemeindeleitung vorbehalten; contacts/attendance/event_attendance kaskadieren.
create policy people_delete on people
  for delete using (is_pfarrer());

-- ---------------------------------------------------------------------------
-- contacts (5.6 + 11: sensibelster Teil, zusätzlich auditiert)
-- ---------------------------------------------------------------------------
alter table contacts enable row level security;

create policy contacts_select on contacts
  for select using (is_pfarrer() or owns_person(person_id));

create policy contacts_insert on contacts
  for insert with check (is_pfarrer() or owns_person(person_id));

create policy contacts_update on contacts
  for update using (is_pfarrer() or owns_person(person_id))
  with check (is_pfarrer() or owns_person(person_id));

create policy contacts_delete on contacts
  for delete using (is_pfarrer() or owns_person(person_id));

-- ---------------------------------------------------------------------------
-- attendance (5.6)
-- ---------------------------------------------------------------------------
alter table attendance enable row level security;

create policy attendance_select on attendance
  for select using (is_pfarrer() or owns_person(person_id));

create policy attendance_insert on attendance
  for insert with check (is_pfarrer() or owns_person(person_id));

create policy attendance_update on attendance
  for update using (is_pfarrer() or owns_person(person_id))
  with check (is_pfarrer() or owns_person(person_id));

create policy attendance_delete on attendance
  for delete using (is_pfarrer() or owns_person(person_id));

-- ---------------------------------------------------------------------------
-- event_sessions / event_attendance (5.6)
-- ---------------------------------------------------------------------------
alter table event_sessions enable row level security;

create policy event_sessions_select on event_sessions
  for select using (
    is_pfarrer()
    or verantwortlich = current_leader_id()
    or exists (
      select 1 from event_attendance ea
      where ea.event_session_id = event_sessions.id and owns_person(ea.person_id)
    )
  );

create policy event_sessions_insert on event_sessions
  for insert with check (is_pfarrer() or verantwortlich = current_leader_id());

create policy event_sessions_update on event_sessions
  for update using (is_pfarrer() or verantwortlich = current_leader_id())
  with check (is_pfarrer() or verantwortlich = current_leader_id());

create policy event_sessions_delete on event_sessions
  for delete using (is_pfarrer());

alter table event_attendance enable row level security;

create policy event_attendance_select on event_attendance
  for select using (
    is_pfarrer()
    or owns_person(person_id)
    or exists (
      select 1 from event_sessions es
      where es.id = event_attendance.event_session_id and es.verantwortlich = current_leader_id()
    )
  );

create policy event_attendance_insert on event_attendance
  for insert with check (
    is_pfarrer()
    or owns_person(person_id)
    or exists (
      select 1 from event_sessions es
      where es.id = event_attendance.event_session_id and es.verantwortlich = current_leader_id()
    )
  );

create policy event_attendance_update on event_attendance
  for update using (
    is_pfarrer()
    or owns_person(person_id)
    or exists (
      select 1 from event_sessions es
      where es.id = event_attendance.event_session_id and es.verantwortlich = current_leader_id()
    )
  )
  with check (
    is_pfarrer()
    or owns_person(person_id)
    or exists (
      select 1 from event_sessions es
      where es.id = event_attendance.event_session_id and es.verantwortlich = current_leader_id()
    )
  );

create policy event_attendance_delete on event_attendance
  for delete using (is_pfarrer());

-- ---------------------------------------------------------------------------
-- Audit-Log (Abschnitt 11): nur per Trigger beschreibbar, nur Pfarrer liest.
-- ---------------------------------------------------------------------------
alter table contacts_audit_log enable row level security;

create policy contacts_audit_log_select on contacts_audit_log
  for select using (is_pfarrer());

-- Bewusst keine insert/update/delete-Policy für normale Clients: nur die
-- security-definer-Trigger-Funktion unten darf schreiben.

create or replace function log_contacts_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into contacts_audit_log (contact_id, person_id, leader_id, aktion)
  values (
    coalesce(new.id, old.id),
    coalesce(new.person_id, old.person_id),
    current_leader_id(),
    lower(tg_op)
  );
  return coalesce(new, old);
end;
$$;

create trigger contacts_audit_trigger
  after insert or update or delete on contacts
  for each row execute function log_contacts_change();
