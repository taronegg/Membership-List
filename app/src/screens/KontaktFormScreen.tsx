import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Header } from '../components/Header';
import { useNavigation } from '../nav/NavigationContext';
import { useLookups } from '../hooks/useLookups';
import { supabase } from '../lib/supabaseClient';

// Abschnitt 6 (Screen-Stack: "Kontakt erfassen -- Button im Sub-Tab
// „Kontakte""), Feldoptik nach 7.4.

export function KontaktFormScreen({ personId }: { personId: string }) {
  const { pop } = useNavigation();
  const { kontaktart, leaders } = useLookups();

  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [verantwortlich, setVerantwortlich] = useState('');
  const [art, setArt] = useState('');
  const [notiz, setNotiz] = useState('');
  const [naechsterSchritt, setNaechsterSchritt] = useState('');
  const [wiedervorlage, setWiedervorlage] = useState('');
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!verantwortlich || !art) {
      setFehler('Verantwortlich und Art sind Pflichtfelder.');
      return;
    }
    setSpeichert(true);
    setFehler(null);
    const { error } = await supabase.from('contacts').insert({
      person_id: personId,
      datum: datum || null,
      verantwortlich,
      art_id: art,
      notiz: notiz || null,
      naechster_schritt: naechsterSchritt || null,
      wiedervorlage: wiedervorlage || null,
    });
    setSpeichert(false);
    if (error) {
      setFehler(error.message);
      return;
    }
    // 8: "Speichern Kontakt: kehrt ins Detail zurück, Sub-Tab „Kontakte" aktiv."
    pop();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Header title="Kontakt erfassen" onBack={pop} />
      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
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

        <Feld label="Art *">
          <select value={art} onChange={(e) => setArt(e.target.value)} style={fieldStyle}>
            <option value="">Bitte wählen</option>
            {kontaktart.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Feld>

        <Feld label="Notiz">
          <textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            style={{ ...fieldStyle, minHeight: 76, resize: 'vertical', padding: 10 }}
          />
        </Feld>

        <Feld label="Nächster Schritt">
          <input type="text" value={naechsterSchritt} onChange={(e) => setNaechsterSchritt(e.target.value)} style={fieldStyle} />
        </Feld>

        <Feld label="Wiedervorlage bis">
          <input type="date" value={wiedervorlage} onChange={(e) => setWiedervorlage(e.target.value)} style={fieldStyle} />
        </Feld>

        {fehler && (
          <div style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent)', color: 'var(--accent-darkest)', padding: 10, fontSize: 13 }}>
            {fehler}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
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
