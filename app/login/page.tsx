'use client';
import { useState } from 'react';
export default function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="cms login">
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const form = new FormData(e.currentTarget);
          try {
            const auth = btoa(
              unescape(
                encodeURIComponent(
                  form.get('username') + ':' + form.get('password'),
                ),
              ),
            );
            const res = await fetch('/api/session', {
              method: 'POST',
              headers: { Authorization: 'Basic ' + auth },
            });
            if (!res.ok) throw Error('Incorrect username or password');
            window.location.assign('/admin');
          } catch (e: any) {
            setError(e.message);
            setBusy(false);
          }
        }}
      >
        <a href="/">VIVIAN KIM STUDIO</a>
        <h1>Studio CMS</h1>
        <label className="field">
          <span>Username</span>
          <input
            name="username"
            defaultValue="admin"
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
