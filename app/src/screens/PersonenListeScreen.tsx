import { useEffect, useMemo, useState } from 'react';
import { Search, ChevronRight, AlertTriangle } from 'lucide-react';
import { usePeopleList } from '../hooks/usePeopleList';
import { useLookups } from '../hooks/useLookups';
import { useAuth } from '../auth/AuthContext';
import { useNavigation } from '../nav/NavigationContext';
import { InitialsBox } from '../components/InitialsBox';
import { StatusChip } from '../components/StatusChip';
import type { PersonListItem } from '../lib/types';

// Abschnitt 7.2: Personen (Liste).

interface FilterState {
  zustaendigId: string | null;
  statusId: string | null;
  bacentaId: string | null;
}

const LEER_FILTER: FilterState = { zustaendigId: null, statusId: null, bacentaId: null };

function FilterRow({
  label,
  optionen,
  aktivId,
  onChange,
  aktivFarbe,
}: {
  label: string;
  optionen: { id: string; name: string }[];
  aktivId: string | null;
  onChange: (id: string | null) => void;
  aktivFarbe: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          color: 'var(--text-tertiary)',
          margin: '0 0 6px',
        }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        <FilterChip label="Alle" active={aktivId === null} onClick={() => onChange(null)} aktivFarbe={aktivFarbe} />
        {optionen.map((o) => (
          <FilterChip
            key={o.id}
            label={o.name}
            active={aktivId === o.id}
            onClick={() => onChange(o.id)}
            aktivFarbe={aktivFarbe}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  aktivFarbe,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  aktivFarbe: string;
}) {
  return (
    <button
      onClick={onClick}
      className="chip"
      style={{
        flexShrink: 0,
        minHeight: 30,
        padding: '0 12px',
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid var(--divider)',
        background: active ? aktivFarbe : 'var(--surface)',
        color: active ? 'var(--bg)' : 'var(--text)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function passtFilter(person: PersonListItem, filter: FilterState, suche: string): boolean {
  if (filter.zustaendigId && person.zustaendig?.id !== filter.zustaendigId) return false;
  if (filter.statusId && person.status?.id !== filter.statusId) return false;
  if (filter.bacentaId && person.bacenta?.id !== filter.bacentaId) return false;
  if (suche.trim() !== '') {
    const q = suche.trim().toLowerCase();
    const haystack = `${person.vorname} ${person.nachname} ${person.bacenta?.name ?? ''} ${person.basonta?.name ?? ''}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function PersonenListeScreen() {
  const { people, loading } = usePeopleList();
  const { status, bacenta, leaders } = useLookups();
  const { leader } = useAuth();
  const { push, pendingPersonenLeiterFilter, consumePendingPersonenLeiterFilter } = useNavigation();
  const [suche, setSuche] = useState('');
  const [filter, setFilter] = useState<FilterState>(LEER_FILTER);

  // 8: "Leiter-Zeile antippen ... setzt den Zuständigkeits-Filter -- alle
  // anderen Filter werden zurückgesetzt." Wird von der Übersicht (7.1) gesetzt.
  useEffect(() => {
    if (pendingPersonenLeiterFilter) {
      setSuche('');
      setFilter({ ...LEER_FILTER, zustaendigId: pendingPersonenLeiterFilter });
      consumePendingPersonenLeiterFilter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPersonenLeiterFilter]);

  const gefiltert = useMemo(() => {
    return people
      .filter((p) => passtFilter(p, filter, suche))
      .sort((a, b) => `${a.vorname} ${a.nachname}`.localeCompare(`${b.vorname} ${b.nachname}`, 'de'));
  }, [people, filter, suche]);

  const filterAktiv = filter.zustaendigId || filter.statusId || filter.bacentaId || suche.trim() !== '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 14px' }}>Personen</h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--surface)',
            border: '1px solid var(--divider)',
            padding: '0 12px',
            minHeight: 40,
            marginBottom: 16,
          }}
        >
          <Search size={16} color="var(--text-tertiary)" />
          <input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Suche nach Name, Bacenta, Basonta"
            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 14, minHeight: 38, outline: 'none' }}
          />
        </div>

        {leader?.rolle === 'pfarrer' && (
          <FilterRow
            label="Zuständige Person"
            optionen={leaders}
            aktivId={filter.zustaendigId}
            onChange={(id) => setFilter((f) => ({ ...f, zustaendigId: id }))}
            aktivFarbe="var(--text)"
          />
        )}
        <FilterRow
          label="Status"
          optionen={status}
          aktivId={filter.statusId}
          onChange={(id) => setFilter((f) => ({ ...f, statusId: id }))}
          aktivFarbe="var(--accent)"
        />
        <FilterRow
          label="Bacenta"
          optionen={bacenta}
          aktivId={filter.bacentaId}
          onChange={(id) => setFilter((f) => ({ ...f, bacentaId: id }))}
          aktivFarbe="var(--text)"
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--text-secondary)',
            padding: '4px 0 10px',
            borderBottom: '2px solid var(--divider)',
          }}
        >
          <span>
            {gefiltert.length} von {people.length} Personen
          </span>
          {filterAktiv && (
            <button
              onClick={() => {
                setFilter(LEER_FILTER);
                setSuche('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-dark)', fontSize: 12, fontWeight: 600, padding: 0 }}
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {loading && <p style={{ color: 'var(--text-tertiary)', padding: '16px 0' }}>Lädt…</p>}
        {!loading && gefiltert.length === 0 && (
          <p style={{ color: 'var(--text-tertiary)', padding: '16px 0' }}>Keine Personen gefunden.</p>
        )}
        {gefiltert.map((p) => (
          <button
            key={p.id}
            onClick={() => push({ type: 'personDetail', personId: p.id, subTab: 'profil' })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid var(--divider)',
              textAlign: 'left',
            }}
          >
            <InitialsBox vorname={p.vorname} nachname={p.nachname} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {p.vorname} {p.nachname}
                </span>
                {p.zuPruefen && <AlertTriangle size={13} color="var(--accent)" />}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                {p.bacenta?.name ?? '—'} · {p.zustaendig?.name ?? '—'} ·{' '}
                {p.quote !== null ? `${Math.round(p.quote * 100)}%` : '—'}
              </p>
            </div>
            {p.status && <StatusChip status={p.status.name} />}
            <ChevronRight size={18} color="var(--chevron)" />
          </button>
        ))}
      </div>
    </div>
  );
}
