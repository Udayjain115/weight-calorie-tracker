import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { login, register } from '../api/client';

function AuthView({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = mode === 'login' ? await login(email, password) : await register(email, password);
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-brand">
          <Dumbbell size={26} />
          <div>
            <p className="eyebrow">Strength Calories</p>
            <h1>{authTitle(mode)}</h1>
          </div>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            {mode === 'login' ? 'Email or username' : 'Email'}
            <input type={mode === 'login' ? 'text' : 'email'} value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : undefined}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Working...' : submitLabel(mode)}
          </button>
        </form>
        <div className="auth-links">
          {mode !== 'login' && <button className="secondary auth-switch" onClick={() => setMode('login')}>Back to login</button>}
          {mode === 'login' && <button className="secondary auth-switch" onClick={() => setMode('register')}>Create an account</button>}
          {mode === 'register' && <button className="secondary auth-switch" onClick={() => setMode('login')}>I already have an account</button>}
        </div>
      </section>
    </main>
  );
}

function authTitle(mode) {
  if (mode === 'register') return 'Create account';
  return 'Log in';
}

function submitLabel(mode) {
  if (mode === 'register') return 'Create account';
  return 'Log in';
}

export default AuthView;
