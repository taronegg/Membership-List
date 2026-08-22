import { Pencil } from 'lucide-react';
import { usePerson } from '../hooks/usePerson';
import { useNavigation, type PersonSubTab } from '../nav/NavigationContext';
import { Header } from '../components/Header';
import { InitialsBox } from '../components/InitialsBox';
import { StatusChip, NeutralChip } from '../components/StatusChip';
import { FieldGroup, FieldRow } from '../components/FieldGroup';
import { formatDatumLang, alterInJahren } from '../lib/format';
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
          {subTab === 'anwesenheit' && (
            <PlatzhalterHinweis text="Anwesenheit folgt in Abschnitt 13, Schritt 6 (Check-in inkl. Offline-Puffer)." />
          )}
          {subTab === 'kontakte' && (
            <PlatzhalterHinweis text="Kontakte folgen in Abschnitt 13, Schritt 7 (Kontakte + Wiedervorlage)." />
          )}
        </div>
      </div>
    </div>
  );
}

function PlatzhalterHinweis({ text }: { text: string }) {
  return <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{text}</p>;
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
