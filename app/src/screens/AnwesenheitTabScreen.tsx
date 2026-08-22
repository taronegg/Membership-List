import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCheckin } from '../hooks/useCheckin';
import { useEventSessions } from '../hooks/useEventSessions';
import { CheckinToggle } from '../components/CheckinToggle';
import { AnwesenheitChip } from '../components/AnwesenheitChip';
import { NeutralChip } from '../components/StatusChip';
import { letzterSonntag, formatDatumKurz } from '../lib/format';
import { useNavigation } from '../nav/NavigationContext';

// Abschnitt 7.5: Anwesenheit (Tab), Sub-Tab "Sonntag". Der Offline-Puffer
// selbst steckt in useCheckin()/useOutboxSync() (Abschnitt 3, 13 Schritt 6).

type SubTab = 'sonntag' | 'events';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'sonntag', label: 'Sonntag' },
  { key: 'events', label: 'Events' },
];

export function AnwesenheitTabScreen() {
  const [subTab, setSubTab] = useState<SubTab>('sonntag');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 14px' }}>Anwesenheit</h1>
        <div style={{ display: 'flex', border: '1px solid var(--divider)', marginBottom: 16 }}>
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
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {subTab === 'sonntag' ? <SonntagCheckin /> : <EventsTab />}
      </div>
    </div>
  );
}

function EventsTab() {
  const { sessions, loading } = useEventSessions();
  const { push } = useNavigation();
  const [aufgeklappt, setAufgeklappt] = useState<string | null>(null);

  return (
    <div style={{ padding: '0 16px 32px' }}>
      <button
        onClick={() => push({ type: 'eventForm' })}
        style={{ width: '100%', minHeight: 44, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontWeight: 800, fontSize: 14, textAlign: 'left', padding: '0 16px', marginBottom: 16 }}
      >
        Event anlegen
      </button>

      {loading && <p style={{ color: 'var(--text-tertiary)' }}>Lädt…</p>}
      {!loading && sessions.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Noch keine Events erfasst.</p>}

      {sessions.map((s) => {
        const anwesendCount = s.teilnehmer.filter((t) => t.anwesend).length;
        const offen = aufgeklappt === s.id;
        return (
          <div key={s.id} style={{ borderBottom: '1px solid var(--divider)' }}>
            <button
              onClick={() => setAufgeklappt(offen ? null : s.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 0', background: 'none', border: 'none', textAlign: 'left' }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{s.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                  {formatDatumKurz(s.datum)} · {s.verantwortlich?.name ?? '—'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <NeutralChip label={`${anwesendCount}/${s.teilnehmer.length}`} />
                <ChevronDown size={16} style={{ transform: offen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
              </div>
            </button>
            {offen && (
              <div style={{ paddingBottom: 10 }}>
                {s.teilnehmer.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '4px 0 8px' }}>Keine Teilnehmer.</p>}
                {s.teilnehmer.map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0 6px 12px', gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{t.personName}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                        {[t.rolle, s.verantwortlich?.name, t.notiz].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <AnwesenheitChip status={t.anwesend ? 'anwesend' : 'abwesend'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SonntagCheckin() {
  const [datum, setDatum] = useState(() => letzterSonntag());
  const { personen, auswahl, setStatus, loading, speichern, speichernJetzt, zaehlung } = useCheckin(datum);

  return (
    <div style={{ padding: '0 16px 32px' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Sonntag</span>
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          style={{
            minHeight: 40,
            background: 'var(--surface)',
            border: '1px solid var(--divider)',
            padding: '0 12px',
            fontSize: 14,
            width: 200,
          }}
        />
      </label>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          background: 'var(--divider)',
          marginBottom: 12,
        }}
      >
        <Kennzahl label="Anwesend" wert={zaehlung.anwesend} />
        <Kennzahl label="Abwesend" wert={zaehlung.abwesend} />
        <Kennzahl label="Offen" wert={zaehlung.offen} />
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>
        x = anwesend, o = abwesend, leer = nicht erfasst
      </p>

      {loading && <p style={{ color: 'var(--text-tertiary)' }}>Lädt…</p>}

      {!loading &&
        personen.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 0',
              borderBottom: '1px solid var(--divider)',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {p.vorname} {p.nachname}
            </span>
            <CheckinToggle value={auswahl[p.id] ?? null} onChange={(v) => setStatus(p.id, v)} />
          </div>
        ))}

      <button
        onClick={() => void speichernJetzt()}
        disabled={loading || speichern === 'speichert'}
        style={{
          marginTop: 20,
          minHeight: 44,
          width: '100%',
          background: 'var(--accent)',
          color: 'var(--bg)',
          border: 'none',
          fontWeight: 800,
          fontSize: 14,
          textAlign: 'left',
          padding: '0 16px',
          opacity: speichern === 'speichert' ? 0.6 : 1,
        }}
      >
        {speichern === 'speichert' ? 'Speichert…' : 'Anwesenheit speichern'}
      </button>

      {speichern === 'gespeichert' && (
        <p style={{ marginTop: 10, color: 'var(--text)', fontSize: 13, fontWeight: 700 }}>Gespeichert ✓</p>
      )}
      {speichern === 'offline' && (
        <p style={{ marginTop: 10, color: 'var(--accent-darkest)', fontSize: 13, fontWeight: 700 }}>
          Offline gespeichert — wird synchronisiert ✓
        </p>
      )}
    </div>
  );
}

function Kennzahl({ label, wert }: { label: string; wert: number }) {
  return (
    <div style={{ background: 'var(--surface)', padding: '10px 12px' }}>
      <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--accent)', margin: '0 0 4px' }}>
        {label}
      </p>
      <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{wert}</p>
    </div>
  );
}
