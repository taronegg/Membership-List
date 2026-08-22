import { FileText, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { initialen } from '../components/InitialsBox';

// Abschnitt 7.7: Profil.
// "Achtung: Der Rollen-Umschalter und die Leiter-Auswahl im Prototyp sind
// reine Demo-Werkzeuge... In der echten App ergibt sich die Rolle aus dem
// Login und darf nicht umschaltbar sein." -- deshalb gibt es hier keinen.

export function ProfilTabScreen() {
  const { leader, signOut } = useAuth();
  if (!leader) return null;

  const untertitel =
    leader.rolle === 'pfarrer'
      ? 'Gemeindeleitung · Zugriff auf alle Daten'
      : 'Gruppenleiter · eigene Personen';

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div
          style={{
            width: 52,
            height: 52,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--accent)',
            color: 'var(--bg)',
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          {initialen(leader.name, '')}
        </div>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>{leader.name}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{untertitel}</p>
        </div>
      </div>

      <MenuZeile
        Icon={FileText}
        label="Datenquellen"
        meta="Excel-Import (einmalig) — siehe import/README.md"
        onClick={() => {}}
      />
      <MenuZeile Icon={Bell} label="Benachrichtigungen" meta="Noch nicht konfigurierbar" onClick={() => {}} />

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button
          onClick={() => void signOut()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 44,
            width: '100%',
            background: 'none',
            border: '1px solid var(--divider)',
            color: 'var(--accent-dark)',
            fontWeight: 700,
            fontSize: 14,
            padding: '0 14px',
          }}
        >
          <LogOut size={17} />
          Abmelden
        </button>
      </div>
    </div>
  );
}

function MenuZeile({
  Icon,
  label,
  meta,
  onClick,
}: {
  Icon: typeof FileText;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        width: '100%',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--divider)',
        textAlign: 'left',
        padding: '10px 0',
      }}
    >
      <Icon size={18} color="var(--text-secondary)" />
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{meta}</p>
      </div>
    </button>
  );
}
