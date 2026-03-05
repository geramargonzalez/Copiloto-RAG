'use client';

import { signIn } from 'next-auth/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

const roles = ['finance', 'sales', 'support', 'admin'];

export const LoginForm = () => {
  const [username, setUsername] = useState('pilot.user');
  const [role, setRole] = useState('support');
  const [loading, setLoading] = useState(false);

  const roleOptions = useMemo(
    () =>
      roles.map((entry) => (
        <option key={entry} value={entry}>
          {entry}
        </option>
      )),
    [],
  );

  const onLocalStubLogin = async () => {
    setLoading(true);
    await signIn('credentials', {
      username,
      role,
      callbackUrl: '/chat',
    });
    setLoading(false);
  };

  return (
    <div className="card" style={{ maxWidth: 540, margin: '72px auto', padding: 28 }}>
      <h1 style={{ marginTop: 0, fontSize: 30 }}>Copiloto RAG</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: 8 }}>
        SSO corporativo (stub) para piloto de solo lectura.
      </p>

      <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
        <label>
          Usuario
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            placeholder="pilot.user"
          />
        </label>
        <label>
          Rol
          <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
            {roleOptions}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <button onClick={onLocalStubLogin} disabled={loading} style={primaryButton}>
          Entrar con stub local
        </button>
        <button
          onClick={() => signIn('corporate-oidc', { callbackUrl: '/chat' })}
          style={secondaryButton}
        >
          Entrar con OIDC
        </button>
      </div>
    </div>
  );
};

const inputStyle: CSSProperties = {
  width: '100%',
  marginTop: 6,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
};

const primaryButton: CSSProperties = {
  background: 'var(--accent)',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  cursor: 'pointer',
};

const secondaryButton: CSSProperties = {
  background: 'transparent',
  color: 'var(--accent-strong)',
  border: '1px solid var(--accent)',
  borderRadius: 10,
  padding: '10px 14px',
  cursor: 'pointer',
};
