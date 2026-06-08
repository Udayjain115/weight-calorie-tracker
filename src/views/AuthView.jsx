import React, { useState } from 'react';
import { ArrowUpRight, Dumbbell } from 'lucide-react';
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
      <a className="skip-link" href="#auth-form">Skip to login</a>
      <section className="auth-marketing" aria-label="Product overview">
        <div className="brand-mark">
          <Dumbbell size={22} />
          <span>Workout Diet Tracker</span>
        </div>
        <p className="eyebrow">Training-first nutrition log</p>
        <h1>Know when to eat more, hold steady, or pull back.</h1>
        <p className="auth-lede">
          Track scale trend, top-set performance, RIR, and off-day context in one place. Use the logbook to decide whether intake should change.
        </p>
        <div className="signal-board" aria-label="Example performance signals">
          <div>
            <span>14-day trend</span>
            <strong>+0.28 lb/wk</strong>
          </div>
          <div>
            <span>Comparable lifts</span>
            <strong>6 of 7 stable</strong>
          </div>
          <div>
            <span>Recommendation</span>
            <strong>Hold at 2,610</strong>
          </div>
        </div>
        <div className="proof-strip">
          <span>Built for lifters who log honestly.</span>
          <ArrowUpRight size={16} />
        </div>
      </section>

      <section className="auth-panel" id="auth-form">
        <div className="auth-brand">
          <div>
            <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your log'}</p>
            <h2>{authTitle(mode)}</h2>
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
          <button className="primary-cta" type="submit" disabled={loading}>
            <span>{loading ? 'Working...' : submitLabel(mode)}</span>
            <span className="cta-icon">
              <ArrowUpRight size={16} />
            </span>
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
