import { useMemo, type ReactNode } from 'react';
import { Users, AlertTriangle, Clock, Cake } from 'lucide-react';
import { istAktiv, istRisikoKontakt, istFaellig } from '@shared/berechnungen';
import { usePeopleList } from '../hooks/usePeopleList';
import { useContactsList } from '../hooks/useContactsList';
import { useLookups } from '../hooks/useLookups';
import { useAuth } from '../auth/AuthContext';
import { useNavigation } from '../nav/NavigationContext';
import { InitialsBox } from '../components/InitialsBox';
import { formatDatumKurz, formatWochentagDatum, plural } from '../lib/format';
import type { PersonListItem } from '../lib/types';
import type { ContactListItem } from '../hooks/useContactsList';

// Abschnitt 7.1: Übersicht (Home) -- aggregiert alles Vorherige, deshalb
// zuletzt gebaut (13, Schritt 8).

export function UebersichtScreen() {
  const { people, loading: peopleLoading } = usePeopleList();
  const { contacts, loading: contactsLoading } = useContactsList();
  const { leaders, risikoSchwellwert, loading: lookupsLoading } = useLookups();
  const { leader } = useAuth();
  const { setTab, push, geheZuPersonenGefiltertNachLeiter } = useNavigation();

  const loading = peopleLoading || contactsLoading || lookupsLoading;

  const aktivePeople = useMemo(() => people.filter((p) => istAktiv(p.status?.name ?? '')), [people]);

  const oQuote = useMemo(() => {
    const quotes = aktivePeople.map((p) => p.quote).filter((q): q is number => q !== null);
    return quotes.length > 0 ? quotes.reduce((a, b) => a + b, 0) / quotes.length : null;
  }, [aktivePeople]);

  const risikoPeople = useMemo(
    () =>
      aktivePeople
        .filter((p) => istRisikoKontakt(p.status?.name ?? '', p.abwesendInFolge, risikoSchwellwert))
        .sort((a, b) => b.abwesendInFolge - a.abwesendInFolge),
    [aktivePeople, risikoSchwellwert],
  );

  const faelligeKontakte = useMemo(
    () =>
      contacts
        .filter((c) => istFaellig(c.wiedervorlage, c.erledigtAm))
        .sort((a, b) => (a.wiedervorlage ?? '').localeCompare(b.wiedervorlage ?? '')),
    [contacts],
  );

  const zuPruefenCount = people.filter((p) => p.zuPruefen).length;
  const erstbesucherCount = people.filter((p) => p.status?.name === 'Erstbesucher').length;

  const geburtstage = useMemo(() => {
    const monat = new Date().getMonth() + 1;
    return people
      .filter((p) => p.geburtsdatum && Number(p.geburtsdatum.split('-')[1]) === monat)
      .map((p) => {
        const [jahr, , tag] = p.geburtsdatum!.split('-').map(Number);
        return { person: p, wird: new Date().getFullYear() - jahr, tag };
      })
      .sort((a, b) => a.tag - b.tag);
  }, [people]);

  if (loading) {
    return <p style={{ padding: 16, color: 'var(--text-tertiary)' }}>Lädt…</p>;
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 16px 32px' }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>
        {formatWochentagDatum()}
      </p>
      <h1 style={{ fontSize: 25, fontWeight: 800, margin: '0 0 20px' }}>Guten Tag, {leader?.name}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--divider)', marginBottom: 20 }}>
        <Kennzahl label="Personen" wert={String(people.length)} />
        <Kennzahl label="Ø Quote" wert={oQuote !== null ? `${Math.round(oQuote * 100)}%` : '—'} />
        <Kennzahl label="Risiko" wert={String(risikoPeople.length)} />
        <Kennzahl label="Wiedervorlage" wert={String(faelligeKontakte.length)} />
        <Kennzahl label="Zu prüfen" wert={String(zuPruefenCount)} />
        <Kennzahl label="Erstbesucher" wert={String(erstbesucherCount)} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <button
          onClick={() => setTab('anwesenheit')}
          style={{ minHeight: 44, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontWeight: 800, fontSize: 14, textAlign: 'left', padding: '0 16px' }}
        >
          Anwesenheit erfassen
        </button>
        <button
          onClick={() => push({ type: 'personForm', mode: 'neu' })}
          style={{ minHeight: 44, background: 'transparent', color: 'var(--text)', border: '1px solid var(--divider)', fontWeight: 700, fontSize: 14, textAlign: 'left', padding: '0 16px' }}
        >
          Person hinzufügen
        </button>
      </div>

      {leader?.rolle === 'pfarrer' && (
        <Section icon={Users} title="Leiter-Übersicht">
          {leaders.length === 0 && <LeererHinweis text="Keine Leiter angelegt." />}
          {leaders.map((l) => {
            const ihrePeople = people.filter((p) => p.zustaendig?.id === l.id);
            const ihreAktiven = ihrePeople.filter((p) => istAktiv(p.status?.name ?? ''));
            const ihreQuotes = ihreAktiven.map((p) => p.quote).filter((q): q is number => q !== null);
            const ihrOQuote = ihreQuotes.length > 0 ? ihreQuotes.reduce((a, b) => a + b, 0) / ihreQuotes.length : null;
            const ihrePersonIds = new Set(ihrePeople.map((p) => p.id));
            const ihreKontakte = contacts.filter((c) => ihrePersonIds.has(c.personId)).length;
            const ihrRisiko = ihreAktiven.filter((p) => istRisikoKontakt(p.status?.name ?? '', p.abwesendInFolge, risikoSchwellwert)).length;

            return (
              <button
                key={l.id}
                onClick={() => geheZuPersonenGefiltertNachLeiter(l.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 0', borderBottom: '1px solid var(--divider)', background: 'none', border: 'none', textAlign: 'left' }}
              >
                <InitialsBox vorname={l.name} nachname="" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{l.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                    {plural(ihrePeople.length, 'Person', 'Personen')} · Ø {ihrOQuote !== null ? `${Math.round(ihrOQuote * 100)}%` : '—'} ·{' '}
                    {plural(ihreKontakte, 'Kontakt', 'Kontakte')}
                  </p>
                </div>
                {ihrRisiko > 0 && <Badge text={`${ihrRisiko} Risiko`} />}
              </button>
            );
          })}
        </Section>
      )}

      <Section icon={AlertTriangle} title="Risiko-Kontakte">
        {risikoPeople.length === 0 && <LeererHinweis text="Keine Risiko-Kontakte aktuell." />}
        {risikoPeople.map((p) => (
          <RisikoZeile key={p.id} person={p} onClick={() => push({ type: 'personDetail', personId: p.id, subTab: 'profil' })} />
        ))}
      </Section>

      <Section icon={Clock} title="Wiedervorlage fällig">
        {faelligeKontakte.length === 0 && <LeererHinweis text="Keine fälligen Wiedervorlagen." />}
        {faelligeKontakte.map((c) => (
          <WiedervorlageZeile key={c.id} kontakt={c} onClick={() => push({ type: 'personDetail', personId: c.personId, subTab: 'kontakte' })} />
        ))}
      </Section>

      <Section icon={Cake} title="Geburtstage im Monat">
        {geburtstage.length === 0 && <LeererHinweis text="Keine Geburtstage diesen Monat." />}
        {geburtstage.map(({ person: p, wird }) => (
          <button
            key={p.id}
            onClick={() => push({ type: 'personDetail', personId: p.id, subTab: 'profil' })}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '9px 0', borderBottom: '1px solid var(--divider)', background: 'none', border: 'none', textAlign: 'left' }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{p.vorname} {p.nachname}</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>wird {wird}</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{formatDatumKurz(p.geburtsdatum)}</span>
          </button>
        ))}
      </Section>
    </div>
  );
}

function Kennzahl({ label, wert }: { label: string; wert: string }) {
  return (
    <div style={{ background: 'var(--surface)', padding: '10px 12px' }}>
      <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--accent)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{wert}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6, borderBottom: '2px solid var(--divider)', marginBottom: 4 }}>
        <Icon size={15} color="var(--accent)" />
        <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function LeererHinweis({ text }: { text: string }) {
  return <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>{text}</p>;
}

function Badge({ text }: { text: string }) {
  return (
    <span style={{ background: 'var(--accent)', color: 'var(--bg)', fontSize: 10, fontWeight: 700, padding: '3px 8px', whiteSpace: 'nowrap' }}>
      {text}
    </span>
  );
}

function RisikoZeile({ person, onClick }: { person: PersonListItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '9px 0', borderBottom: '1px solid var(--divider)', background: 'none', border: 'none', textAlign: 'left' }}
    >
      <InitialsBox vorname={person.vorname} nachname={person.nachname} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{person.vorname} {person.nachname}</p>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
          {person.bacenta?.name ?? '—'} · {person.zustaendig?.name ?? '—'}
        </p>
      </div>
      <span style={{ background: 'var(--accent-dark)', color: 'var(--bg)', fontSize: 10, fontWeight: 700, padding: '3px 8px', whiteSpace: 'nowrap' }}>
        {person.abwesendInFolge}× WEG
      </span>
    </button>
  );
}

function WiedervorlageZeile({ kontakt, onClick }: { kontakt: ContactListItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', padding: '9px 0', borderBottom: '1px solid var(--divider)', background: 'none', border: 'none', textAlign: 'left' }}
    >
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{kontakt.personName}</p>
        {kontakt.naechsterSchritt && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{kontakt.naechsterSchritt}</p>}
      </div>
      <span style={{ background: 'var(--accent)', color: 'var(--bg)', fontSize: 10, fontWeight: 700, padding: '3px 8px', whiteSpace: 'nowrap' }}>
        {formatDatumKurz(kontakt.wiedervorlage)}
      </span>
    </button>
  );
}
