import { Pencil, ArrowRight } from 'lucide-react';
import { usePerson } from '../hooks/usePerson';
import { usePersonAttendance } from '../hooks/usePersonAttendance';
import { usePersonContacts } from '../hooks/usePersonContacts';
import { useNavigation, type PersonSubTab } from '../nav/NavigationContext';
import { Header } from '../components/Header';
import { InitialsBox } from '../components/InitialsBox';
import { StatusChip, NeutralChip } from '../components/StatusChip';
import { FieldGroup, FieldRow } from '../components/FieldGroup';
import { SonntagsStreifen } from '../components/SonntagsStreifen';
import { formatDatumLang, formatDatumKurz, alterInJahren } from '../lib/format';
import { formatPhoneCH } from '@shared/telefon';

// Abschnitt 7.3: Personen-Detail.

const SUB_TABS: { key: PersonSubTab; label: string }[] = [
  { key: 'profil', label: 'Profil' },
  { key: 'anwesenheit', label: 'Anwesenheit' },
  { key: 'kontakte', label: 'Kontakte' },
];

export function PersonenDetailScreen({ personId, subTab }: { personId: string; subTab: PersonSubTab }) {
  const { person, kontaktStats, loading } = usePerson(personId);
  const { pop, setPersonSubTab, push } = useNavigation();

  if (loading || !person) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header title="" onBack={pop} />
        <p style={{ padding: 16, color: 'var(--text-tertiary)' }}>{loading ? 'Lädt…' : 'Person nicht gefunden.'}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Header
        title=""
        onBack={pop}
        action={
          <button
            onClick={() => push({ type: 'personForm', mode: 'bearbeiten', personId })}
            aria-label="Person bearbeiten"
            style={{ background: 'none', border: 'none', minWidth: 44, minHeight: 44, display: 'flex', justifyContent: 'flex-end' }}
          >
            <Pencil size={19} />
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '20px 16px 0', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <InitialsBox vorname={person.vorname} nachname={person.nachname} size={56} />
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>
              {person.vorname} {person.nachname}
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 8px' }}>{person.id}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {person.status && <StatusChip status={person.status.name} />}
              {person.bacenta && <NeutralChip label={person.bacenta.name} />}
            </div>
          </div>
        </div>

        {person.zuPruefen && (
          <div
            style={{
              margin: '14px 16px 0',
              background: 'var(--accent-tint)',
              border: '1px solid var(--accent)',
              color: 'var(--accent-darkest)',
              padding: 10,
              fontSize: 13,
            }}
          >
            Zu prüfen — Angaben unvollständig oder unbestätigt
          </div>
        )}

        <div style={{ display: 'flex', border: '1px solid var(--divider)', margin: '16px 16px 0' }}>
          {SUB_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPersonSubTab(key)}
              style={{
                flex: 1,
                minHeight: 40,
                border: 'none',
                background: subTab === key ? 'var(--text)' : 'transparent',
                color: subTab === key ? 'var(--bg)' : 'var(--text)',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '18px 16px 32px' }}>
          {subTab === 'profil' && <ProfilSubTab person={person} kontaktStats={kontaktStats} />}
          {subTab === 'anwesenheit' && <AnwesenheitSubTab personId={personId} />}
          {subTab === 'kontakte' && <KontakteSubTab personId={personId} />}
        </div>
      </div>
    </div>
  );
}

function PlatzhalterHinweis({ text }: { text: string }) {
  return <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{text}</p>;
}

/** 7.3: Status-Chip mit dem Anwesenheits-Zustand als Text ("anwesend" / "abwesend" / "nicht erfasst"). */
function AnwesenheitChip({ status }: { status: 'anwesend' | 'abwesend' | null }) {
  const bg = status === 'anwesend' ? 'var(--text)' : status === 'abwesend' ? 'var(--accent)' : 'var(--chip-neutral-bg)';
  const fg = status ? 'var(--bg)' : 'var(--chip-neutral-text)';
  return (
    <span className="chip" style={{ display: 'inline-block', background: bg, color: fg, fontSize: 10, fontWeight: 700, padding: '3px 8px' }}>
      {status ?? 'nicht erfasst'}
    </span>
  );
}

function AnwesenheitSubTab({ personId }: { personId: string }) {
  const { eintraege, stats, loading } = usePersonAttendance(personId);

  if (loading) return <p style={{ color: 'var(--text-tertiary)' }}>Lädt…</p>;
  if (!stats) return null;

  const zellen: [string, string][] = [
    ['Quote', stats.quote !== null ? `${Math.round(stats.quote * 100)}%` : '—'],
    ['Anwesend', String(stats.anwesend)],
    ['Abwesend', String(stats.abwesend)],
    ['Erfasst', String(stats.erfasst)],
    ['Abw. in Folge', String(stats.abwesendInFolge)],
    ['Letzte Anw.', formatDatumKurz(stats.letzteAnwesenheit)],
  ];

  const einzeltermine = [...eintraege].reverse(); // neueste zuerst

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--divider)', marginBottom: 20 }}>
        {zellen.map(([label, wert]) => (
          <div key={label} style={{ background: 'var(--surface)', padding: '10px 12px' }}>
            <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--accent)', margin: '0 0 4px' }}>
              {label}
            </p>
            <p style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{wert}</p>
          </div>
        ))}
      </div>

      <FieldGroup title="Letzte 12 Sonntage">
        <SonntagsStreifen eintraege={eintraege} />
      </FieldGroup>

      <FieldGroup title="Einzeltermine">
        {einzeltermine.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Keine erfassten Sonntage.</p>}
        {einzeltermine.map((e) => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
            <span style={{ fontSize: 13 }}>{formatDatumKurz(e.datum)}</span>
            <AnwesenheitChip status={e.status} />
          </div>
        ))}
      </FieldGroup>

      <FieldGroup title="Events">
        <PlatzhalterHinweis text="Events folgen in Abschnitt 13, Schritt 9." />
      </FieldGroup>
    </>
  );
}

function ProfilSubTab({
  person,
  kontaktStats,
}: {
  person: NonNullable<ReturnType<typeof usePerson>['person']>;
  kontaktStats: ReturnType<typeof usePerson>['kontaktStats'];
}) {
  const alter = alterInJahren(person.geburtsdatum);

  return (
    <>
      <FieldGroup title="Stammdaten">
        <FieldRow label="Name" value={`${person.vorname} ${person.nachname}`} />
        <FieldRow label="Status" value={person.status?.name} />
        <FieldRow label="Telefon" value={formatPhoneCH(person.telefon)} />
        <FieldRow
          label="Geburtsdatum"
          value={person.geburtsdatum ? `${formatDatumLang(person.geburtsdatum)} (${alter})` : '—'}
        />
        <FieldRow label="Adresse" value={person.adresse} />
      </FieldGroup>

      <FieldGroup title="Gemeinde">
        <FieldRow label="Zuständige Person" value={person.zustaendig?.name} />
        <FieldRow label="Bacenta" value={person.bacenta?.name} />
        <FieldRow label="Basonta" value={person.basonta?.name} />
      </FieldGroup>

      <FieldGroup title="Bildung">
        <FieldRow label="Bildung" value={person.bildung?.name} />
        <FieldRow label="Richtung" value={person.richtung} />
        <FieldRow label="Bildungsjahr" value={person.bildungsjahr?.name} />
      </FieldGroup>

      <FieldGroup title="Herkunft & Betreuung">
        <FieldRow label="Wie entdeckt" value={person.wieEntdeckt?.name} />
        <FieldRow label="Erstkontakt" value={formatDatumLang(person.erstkontakt)} />
        <FieldRow label="Besucher 1" value={person.besucher1?.name} />
        <FieldRow label="Besucher 2" value={person.besucher2?.name} />
      </FieldGroup>

      <FieldGroup title="Kontaktverlauf">
        <FieldRow label="Letzter Kontakt" value={formatDatumLang(kontaktStats?.letzterKontakt ?? null)} />
        <FieldRow
          label="Tage seit Kontakt"
          value={kontaktStats?.tageSeitKontakt !== null && kontaktStats?.tageSeitKontakt !== undefined ? kontaktStats.tageSeitKontakt : '—'}
        />
        <FieldRow label="Kontakte total" value={kontaktStats?.kontakteTotal ?? 0} />
        <FieldRow label="Letzter Besuch" value={formatDatumLang(kontaktStats?.letzterBesuch ?? null)} />
        <FieldRow label="Letzte Beratung" value={formatDatumLang(kontaktStats?.letzteBeratung ?? null)} />
      </FieldGroup>

      {person.notizen && (
        <FieldGroup title="Notizen">
          <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, textWrap: 'pretty' }}>{person.notizen}</p>
        </FieldGroup>
      )}
    </>
  );
}

function KontakteSubTab({ personId }: { personId: string }) {
  const { contacts, stats, loading } = usePersonContacts(personId);
  const { push } = useNavigation();

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--divider)', marginBottom: 16 }}>
        <Kennzahl label="Kontakte" wert={String(stats?.kontakteTotal ?? 0)} />
        <Kennzahl label="Tage seit" wert={stats?.tageSeitKontakt !== null && stats?.tageSeitKontakt !== undefined ? String(stats.tageSeitKontakt) : '—'} />
        <Kennzahl label="Letzter" wert={formatDatumKurz(stats?.letzterKontakt ?? null)} />
      </div>

      <button
        onClick={() => push({ type: 'kontaktForm', personId })}
        style={{ width: '100%', minHeight: 44, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontWeight: 800, fontSize: 14, textAlign: 'left', padding: '0 16px', marginBottom: 18 }}
      >
        Kontakt erfassen
      </button>

      {loading && <p style={{ color: 'var(--text-tertiary)' }}>Lädt…</p>}
      {!loading && contacts.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Noch keine Kontakte erfasst.</p>}

      {contacts.map((c) => (
        <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>{c.datum ? formatDatumKurz(c.datum) : 'Datum fehlt'}</span>
            {c.art && <NeutralChip label={c.art.name} />}
          </div>
          {c.notiz && <p style={{ fontSize: 13, lineHeight: 1.5, margin: '6px 0 0' }}>{c.notiz}</p>}
          {c.naechsterSchritt && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent-darkest)', margin: '6px 0 0' }}>
              <ArrowRight size={13} color="var(--accent)" /> {c.naechsterSchritt}
            </p>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
            {c.verantwortlich?.name ?? '—'}
            {c.wiedervorlage ? ` · Wiedervorlage ${formatDatumKurz(c.wiedervorlage)}` : ''}
          </p>
        </div>
      ))}
    </>
  );
}

function Kennzahl({ label, wert }: { label: string; wert: string }) {
  return (
    <div style={{ background: 'var(--surface)', padding: '10px 12px' }}>
      <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--accent)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{wert}</p>
    </div>
  );
}
