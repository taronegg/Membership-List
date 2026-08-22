import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { istFaellig } from '@shared/berechnungen';
import { useContactsList, type ContactListItem } from '../hooks/useContactsList';
import { useNavigation } from '../nav/NavigationContext';
import { KontaktStatusChip } from '../components/KontaktStatusChip';
import { formatDatumKurz } from '../lib/format';
import { markiereWiedervorlageErledigt } from '../lib/contactsActions';

// Abschnitt 7.6: Kontakte (Tab).

type SubTab = 'faellig' | 'offen' | 'alle';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'faellig', label: 'Fällig' },
  { key: 'offen', label: 'Offene Schritte' },
  { key: 'alle', label: 'Alle' },
];

export function KontakteTabScreen() {
  const { contacts, loading, reload } = useContactsList();
  const { push } = useNavigation();
  const [subTab, setSubTab] = useState<SubTab>('faellig');

  const gefiltert = useMemo(() => {
    if (subTab === 'faellig') {
      // 5.4: Sortierung aufsteigend (ältestes zuerst).
      return contacts
        .filter((c) => istFaellig(c.wiedervorlage, c.erledigtAm))
        .sort((a, b) => (a.wiedervorlage ?? '').localeCompare(b.wiedervorlage ?? ''));
    }
    if (subTab === 'offen') {
      return contacts
        .filter((c) => !!c.naechsterSchritt)
        .sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? ''));
    }
    return [...contacts].sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? ''));
  }, [contacts, subTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 14px' }}>Kontakte</h1>
        <div style={{ display: 'flex', border: '1px solid var(--divider)', marginBottom: 10 }}>
          {SUB_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              style={{
                flex: 1,
                minHeight: 40,
                border: 'none',
                background: subTab === key ? 'var(--text)' : 'transparent',
                color: subTab === key ? 'var(--bg)' : 'var(--text)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
          {gefiltert.length} Einträge
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        {loading && <p style={{ color: 'var(--text-tertiary)' }}>Lädt…</p>}
        {!loading && gefiltert.length === 0 && (
          <p style={{ color: 'var(--text-tertiary)' }}>Keine Einträge.</p>
        )}
        {gefiltert.map((c) => (
          <ContactRow
            key={c.id}
            contact={c}
            onOpen={() => push({ type: 'personDetail', personId: c.personId, subTab: 'kontakte' })}
            onErledigt={
              subTab === 'faellig'
                ? async () => {
                    await markiereWiedervorlageErledigt(c.id);
                    reload();
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function ContactRow({
  contact,
  onOpen,
  onErledigt,
}: {
  contact: ContactListItem;
  onOpen: () => void;
  onErledigt?: () => void;
}) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
      <button onClick={onOpen} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{contact.personName}</span>
          <KontaktStatusChip wiedervorlage={contact.wiedervorlage} erledigtAm={contact.erledigtAm} artName={contact.art?.name ?? '—'} />
        </div>
        {contact.notiz && <p style={{ fontSize: 13, margin: '4px 0 0', color: 'var(--text-secondary)' }}>{contact.notiz}</p>}
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
          {contact.datum ? formatDatumKurz(contact.datum) : 'Datum fehlt'} · {contact.art?.name ?? '—'} ·{' '}
          {contact.verantwortlich?.name ?? '—'}
          {contact.naechsterSchritt ? ` · ${contact.naechsterSchritt}` : ''}
        </p>
      </button>
      {onErledigt && (
        <button
          onClick={onErledigt}
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 32,
            padding: '0 10px',
            background: 'none',
            border: '1px solid var(--divider)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <Check size={13} /> Erledigt
        </button>
      )}
    </div>
  );
}
