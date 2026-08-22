import { useState, type CSSProperties, type FormEvent } from 'react';
import { useAuth } from './AuthContext';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const message = await signIn(email, password);
    setSubmitting(false);
    if (message) setError(message);
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'var(--space-screen)',
        maxWidth: 360,
        margin: '0 auto',
      }}
    >
      <p
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: 'var(--text-tertiary)',
          margin: '0 0 4px',
        }}
      >
        ELK Basel
      </p>
      <h1 style={{ fontSize: 25, fontWeight: 800, margin: '0 0 24px' }}>Anmelden</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>E-Mail</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Passwort</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={fieldStyle}
          />
        </label>

        {error && (
          <div
            style={{
              background: 'var(--accent-tint)',
              border: '1px solid var(--accent)',
              color: 'var(--accent-darkest)',
              padding: 10,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 8,
            minHeight: 44,
            background: 'var(--accent)',
            color: 'var(--bg)',
            border: 'none',
            fontWeight: 800,
            fontSize: 14,
            textAlign: 'left',
            padding: '0 16px',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Anmelden…' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}

const fieldStyle: CSSProperties = {
  minHeight: 40,
  background: 'var(--surface)',
  border: '1px solid var(--divider)',
  padding: '0 12px',
  fontSize: 14,
};
