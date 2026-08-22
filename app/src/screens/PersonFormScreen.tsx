import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Header } from '../components/Header';
import { FieldGroup } from '../components/FieldGroup';
import { useNavigation } from '../nav/NavigationContext';
import { useLookups } from '../hooks/useLookups';
import { usePerson } from '../hooks/usePerson';
import { supabase } from '../lib/supabaseClient';
import { normalizePhoneCH } from '@shared/telefon';

// Abschnitt 7.4: Person anlegen/bearbeiten. Alle Felder aus 4.1, gruppiert wie
// im Profil-Sub-Tab (7.3). Validierung nach 7.4: Vorname/Nachname und
// Zuständige Person sind Pflicht (sonst fällt die Person aus jeder
// Leiter-Sicht, 5.6); Telefon wird auf eine plausible CH-Nummer geprüft,
// aber nicht erzwungen. `status_id`/`zustaendig` sind zusätzlich in der DB
// NOT NULL (0001_schema.sql) -- Status daher ebenfalls Pflicht, auch wenn
// 7.4 es nicht explizit als "Pflichtfeld" nennt.

interface FormState {
  vorname: string;
  nachname: string;
  statusId: string;
  zustaendigId: string;
  telefon: string;
  geburtsdatum: string;
  adresse: string;
  bacentaId: string;
  basontaId: string;
  bildungId: string;
  richtung: string;
  bildungsjahrId: string;
  wieEntdecktId: string;
  erstkontakt: string;
  besucher1Id: string;
  besucher2Id: string;
  notizen: string;
  zuPruefen: boolean;
}

const LEER_FORMULAR: FormState = {
  vorname: '',
  nachname: '',
  statusId: '',
  zustaendigId: '',
  telefon: '',
  geburtsdatum: '',
  adresse: '',
  bacentaId: '',
  basontaId: '',
  bildungId: '',
  richtung: '',
  bildungsjahrId: '',
  wieEntdecktId: '',
  erstkontakt: '',
  besucher1Id: '',
  besucher2Id: '',
  notizen: '',
  // 7.4: "Neue Personen erhalten zu_pruefen = true als Vorbelegung -- bewusst,
  // damit Schnellerfassung im Gottesdienst später nachgepflegt wird."
  zuPruefen: true,
};

type Props = { mode: 'neu' } | { mode: 'bearbeiten'; personId: string };

export function PersonFormScreen(props: Props) {
  const { pop, setTab } = useNavigation();
  const lookups = useLookups();
  const bearbeiten = props.mode === 'bearbeiten';
  const { person, loading: personLoading } = usePerson(bearbeiten ? props.personId : null);

  const [form, setForm] = useState<FormState>(LEER_FORMULAR);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string[]>([]);
  const [telefonHinweis, setTelefonHinweis] = useState(false);

  useEffect(() => {
    if (bearbeiten && person) {
      setForm({
        vorname: person.vorname,
        nachname: person.nachname,
        statusId: person.status?.id ?? '',
        zustaendigId: person.zustaendig?.id ?? '',
        telefon: person.telefon ?? '',
        geburtsdatum: person.geburtsdatum ?? '',
        adresse: person.adresse ?? '',
        bacentaId: person.bacenta?.id ?? '',
        basontaId: person.basonta?.id ?? '',
        bildungId: person.bildung?.id ?? '',
        richtung: person.richtung ?? '',
        bildungsjahrId: person.bildungsjahr?.id ?? '',
        wieEntdecktId: person.wieEntdeckt?.id ?? '',
        erstkontakt: person.erstkontakt ?? '',
        besucher1Id: person.besucher1?.id ?? '',
        besucher2Id: person.besucher2?.id ?? '',
        notizen: person.notizen ?? '',
        zuPruefen: person.zuPruefen,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bearbeiten, person]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const fehlerListe: string[] = [];
    if (!form.vorname.trim()) fehlerListe.push('Vorname ist ein Pflichtfeld.');
    if (!form.nachname.trim()) fehlerListe.push('Nachname ist ein Pflichtfeld.');
    if (!form.statusId) fehlerListe.push('Status ist ein Pflichtfeld.');
    if (!form.zustaendigId) fehlerListe.push('Zuständige Person ist ein Pflichtfeld.');
    if (fehlerListe.length > 0) {
      setFehler(fehlerListe);
      return;
    }
    setFehler([]);

    const telefonNormalisiert = form.telefon.trim() ? normalizePhoneCH(form.telefon.trim()) : null;
    setTelefonHinweis(!!telefonNormalisiert && !/^\+41\d{9}$/.test(telefonNormalisiert));

    const payload = {
      vorname: form.vorname.trim(),
      nachname: form.nachname.trim(),
      status_id: form.statusId,
      zustaendig: form.zustaendigId,
      telefon: telefonNormalisiert,
      geburtsdatum: form.geburtsdatum || null,
      adresse: form.adresse.trim() || null,
      bacenta_id: form.bacentaId || null,
      basonta_id: form.basontaId || null,
      bildung_id: form.bildungId || null,
      richtung: form.richtung.trim() || null,
      bildungsjahr_id: form.bildungsjahrId || null,
      wie_entdeckt_id: form.wieEntdecktId || null,
      erstkontakt: form.erstkontakt || null,
      besucher1: form.besucher1Id || null,
      besucher2: form.besucher2Id || null,
      notizen: form.notizen.trim() || null,
      zu_pruefen: form.zuPruefen,
    };

    setSpeichert(true);
    if (props.mode === 'neu') {
      const { error } = await supabase.from('people').insert(payload);
      setSpeichert(false);
      if (error) {
        setFehler([error.message]);
        return;
      }
      // 8: "Speichern Person (neu): springt auf den Personen-Tab, damit man
      // den neuen Eintrag in der Liste sieht."
      setTab('personen');
    } else {
      const { error } = await supabase.from('people').update(payload).eq('id', props.personId);
      setSpeichert(false);
      if (error) {
        setFehler([error.message]);
        return;
      }
      // 8: "Speichern Person (bearbeiten): kehrt ins Detail zurück."
      pop();
    }
  }

  if (bearbeiten && personLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header title="Person bearbeiten" onBack={pop} />
        <p style={{ padding: 16, color: 'var(--text-tertiary)' }}>Lädt…</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Header title={bearbeiten ? 'Person bearbeiten' : 'Neue Person'} onBack={pop} />
      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <FieldGroup title="Stammdaten">
          <Feld label="Vorname *">
            <input type="text" value={form.vorname} onChange={(e) => set('vorname', e.target.value)} style={feldStil} />
          </Feld>
          <Feld label="Nachname *">
            <input type="text" value={form.nachname} onChange={(e) => set('nachname', e.target.value)} style={feldStil} />
          </Feld>
          <Feld label="Status *">
            <Auswahl value={form.statusId} onChange={(v) => set('statusId', v)} optionen={lookups.status} />
          </Feld>
          <Feld label="Telefon">
            <input type="tel" value={form.telefon} onChange={(e) => set('telefon', e.target.value)} style={feldStil} />
            {telefonHinweis && (
              <p style={{ fontSize: 12, color: 'var(--accent-darkest)', margin: '4px 0 0' }}>
                Sieht nicht wie eine gültige Schweizer Nummer aus -- wird trotzdem gespeichert.
              </p>
            )}
          </Feld>
          <Feld label="Geburtsdatum">
            <input type="date" value={form.geburtsdatum} onChange={(e) => set('geburtsdatum', e.target.value)} style={feldStil} />
          </Feld>
          <Feld label="Adresse">
            <input type="text" value={form.adresse} onChange={(e) => set('adresse', e.target.value)} style={feldStil} />
          </Feld>
        </FieldGroup>

        <FieldGroup title="Gemeinde">
          <Feld label="Zuständige Person *">
            <Auswahl value={form.zustaendigId} onChange={(v) => set('zustaendigId', v)} optionen={lookups.leaders} />
          </Feld>
          <Feld label="Bacenta">
            <Auswahl value={form.bacentaId} onChange={(v) => set('bacentaId', v)} optionen={lookups.bacenta} />
          </Feld>
          <Feld label="Basonta">
            <Auswahl value={form.basontaId} onChange={(v) => set('basontaId', v)} optionen={lookups.basonta} />
          </Feld>
        </FieldGroup>

        <FieldGroup title="Bildung">
          <Feld label="Bildung">
            <Auswahl value={form.bildungId} onChange={(v) => set('bildungId', v)} optionen={lookups.bildung} />
          </Feld>
          <Feld label="Richtung">
            <input type="text" value={form.richtung} onChange={(e) => set('richtung', e.target.value)} style={feldStil} />
          </Feld>
          <Feld label="Bildungsjahr">
            <Auswahl value={form.bildungsjahrId} onChange={(v) => set('bildungsjahrId', v)} optionen={lookups.bildungsjahr} />
          </Feld>
        </FieldGroup>

        <FieldGroup title="Herkunft & Betreuung">
          <Feld label="Wie entdeckt">
            <Auswahl value={form.wieEntdecktId} onChange={(v) => set('wieEntdecktId', v)} optionen={lookups.wieEntdeckt} />
          </Feld>
          <Feld label="Erstkontakt">
            <input type="date" value={form.erstkontakt} onChange={(e) => set('erstkontakt', e.target.value)} style={feldStil} />
          </Feld>
          <Feld label="Besucher 1">
            <Auswahl value={form.besucher1Id} onChange={(v) => set('besucher1Id', v)} optionen={lookups.leaders} />
          </Feld>
          <Feld label="Besucher 2">
            <Auswahl value={form.besucher2Id} onChange={(v) => set('besucher2Id', v)} optionen={lookups.leaders} />
          </Feld>
        </FieldGroup>

        <FieldGroup title="Notizen">
          <textarea
            value={form.notizen}
            onChange={(e) => set('notizen', e.target.value)}
            style={{ ...feldStil, minHeight: 76, resize: 'vertical', padding: 10 }}
          />
        </FieldGroup>

        <div style={{ marginBottom: 20 }}>
          <ZuPruefenCheckbox checked={form.zuPruefen} onChange={(v) => set('zuPruefen', v)} />
        </div>

        {fehler.length > 0 && (
          <div style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent)', color: 'var(--accent-darkest)', padding: 10, fontSize: 13, marginBottom: 16 }}>
            {fehler.map((f) => (
              <p key={f} style={{ margin: 0 }}>
                {f}
              </p>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
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
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </label>
  );
}

function Auswahl({
  value,
  onChange,
  optionen,
}: {
  value: string;
  onChange: (v: string) => void;
  optionen: { id: string; name: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={feldStil}>
      <option value="">Bitte wählen</option>
      {optionen.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

function ZuPruefenCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <span style={{ position: 'relative', width: 18, height: 18, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ position: 'absolute', inset: 0, opacity: 0, margin: 0, cursor: 'pointer' }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid var(--text)',
            background: checked ? 'var(--text)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {checked && <Check size={12} color="var(--bg)" strokeWidth={3} />}
        </span>
      </span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>Zu prüfen markieren</span>
    </label>
  );
}

const feldStil: CSSProperties = {
  minHeight: 40,
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--divider)',
  padding: '0 12px',
  fontSize: 14,
};
