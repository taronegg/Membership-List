import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Header } from '../components/Header';
import { useNavigation } from '../nav/NavigationContext';
import { useLookups } from '../hooks/useLookups';
import { usePeopleList } from '../hooks/usePeopleList';
import { supabase } from '../lib/supabaseClient';

// Abschnitt 12, Lücke 2: "Event anlegen. Events sind nur lesbar. Es fehlt
// das Erfassen einer neuen Session inkl. Teilnehmerliste." -- genau das
// baut dieser Screen.

interface TeilnehmerAuswahl {
  gewaehlt: boolean;
  rolle: string;
  anwesend: boolean;
}

export function EventFormScreen() {
  const { pop } = useNavigation();
  const { leaders } = useLookups();
  const { people } = usePeopleList();

  const [name, setName] = useState('');
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [verantwortlich, setVerantwortlich] = useState('');
  const [auswahl, setAuswahl] = useState<Record<string, TeilnehmerAuswahl>>({});
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const sortiertePeople = [...people].sort((a, b) => `${a.vorname} ${a.nachname}`.localeCompare(`${b.vorname} ${b.nachname}`, 'de'));
  const ausgewaehlteAnzahl = Object.values(auswahl).filter((a) => a.gewaehlt).length;

  function toggleTeilnehmer(personId: string) {
    setAuswahl((a) => ({
      ...a,
      [personId]: {
        gewaehlt: !a[personId]?.gewaehlt,
        rolle: a[personId]?.rolle ?? '',
        anwesend: a[personId]?.anwesend ?? false,
      },
    }));
  }

  function setRolle(personId: string, rolle: string) {
    setAuswahl((a) => ({ ...a, [personId]: { ...a[personId], gewaehlt: true, rolle, anwesend: a[personId]?.anwesend ?? false } }));
  }

  function setAnwesend(personId: string, anwesend: boolean) {
    setAuswahl((a) => ({ ...a, [personId]: { ...a[personId], gewaehlt: true, rolle: a[personId]?.rolle ?? '', anwesend } }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !verantwortlich) {
      setFehler('Name und Verantwortlich sind Pflichtfelder.');
      return;
    }
    setSpeichert(true);
    setFehler(null);

    const { data: session, error } = await supabase
      .from('event_sessions')
      .insert({ name, datum, verantwortlich })
      .select('id')
      .single();
    if (error || !session) {
      setFehler(error?.message ?? 'Event konnte nicht angelegt werden.');
      setSpeichert(false);
      return;
    }

    const teilnehmerRows = Object.entries(auswahl)
      .filter(([, v]) => v.gewaehlt)
      .map(([personId, v]) => ({
        event_session_id: session.id,
        person_id: personId,
        rolle: v.rolle || null,
        anwesend: v.anwesend,
      }));

    if (teilnehmerRows.length > 0) {
      const { error: attError } = await supabase.from('event_attendance').insert(teilnehmerRows);
      if (attError) {
        setFehler(attError.message);
        setSpeichert(false);
        return;
      }
    }

    setSpeichert(false);
    pop();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Header title="Event anlegen" onBack={pop} />
      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Feld label="Name *">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} />
          </Feld>
          <Feld label="Datum">
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={fieldStyle} />
          </Feld>
          <Feld label="Verantwortlich *">
            <select value={verantwortlich} onChange={(e) => setVerantwortlich(e.target.value)} style={fieldStyle}>
              <option value="">Bitte wählen</option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Feld>

          {fehler && (
            <div style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent)', color: 'var(--accent-darkest)', padding: 10, fontSize: 13 }}>
              {fehler}
            </div>
          )}
        </div>

        <div style={{ padding: '0 16px' }}>
          <h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 8px', paddingBottom: 6, borderBottom: '2px solid var(--divider)' }}>
            Teilnehmer ({ausgewaehlteAnzahl})
          </h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {sortiertePeople.map((p) => {
            const a = auswahl[p.id];
            return (
              <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600 }}>
                  <input type="checkbox" checked={a?.gewaehlt ?? false} onChange={() => toggleTeilnehmer(p.id)} style={{ width: 18, height: 18 }} />
                  {p.vorname} {p.nachname}
                </label>
                {a?.gewaehlt && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, marginLeft: 28 }}>
                    <input
                      type="text"
                      placeholder="Rolle"
                      value={a.rolle}
                      onChange={(e) => setRolle(p.id, e.target.value)}
                      style={{ ...fieldStyle, minHeight: 34, flex: 1 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={a.anwesend} onChange={(e) => setAnwesend(p.id, e.target.checked)} style={{ width: 16, height: 16 }} />
                      Anwesend
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: 16 }}>
          <button
            type="submit"
            disabled={speichert}
            style={{ flex: 1, minHeight: 44, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontWeight: 800, fontSize: 14, textAlign: 'left', padding: '0 16px', opacity: speichert ? 0.6 : 1 }}
          >
            {speichert ? 'Speichert…' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={pop}
            style={{ flex: 1, minHeight: 44, background: 'transparent', color: 'var(--text)', border: '1px solid var(--divider)', fontWeight: 700, fontSize: 14, textAlign: 'left', padding: '0 16px' }}
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}

function Feld({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </label>
  );
}

const fieldStyle: CSSProperties = {
  minHeight: 40,
  background: 'var(--surface)',
  border: '1px solid var(--divider)',
  padding: '0 12px',
  fontSize: 14,
};
