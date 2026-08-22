-- Der Import (Abschnitt 10, Schritt 2) gleicht Leiter per Name aus der
-- Liste "Verantwortliche" ab (upsert). Dafür braucht `leaders.name` eine
-- Unique-Constraint, so wie sie die anderen Stammlisten-Tabellen bereits haben.
alter table leaders add constraint leaders_name_key unique (name);
