import React from 'react';
import { Dumbbell, Scale, Settings } from 'lucide-react';

export const TRACKING_MODES = [
  {
    id: 'lifts',
    title: 'Just Lifts',
    detail: 'Keep the app focused on workouts, exercise trends, training cycles, and strength alerts.',
    icon: Dumbbell,
  },
  {
    id: 'full',
    title: 'Calories, Weights, and Lifts',
    detail: 'Use the full tracker: body weight, daily intake target, workouts, and recommendation logic.',
    icon: Scale,
  },
];

function SettingsView({ state, setTrackingMode, setUnit }) {
  return (
    <section className="stack settings-view">
      <section className="panel settings-hero">
        <div className="panel-title">
          <Settings size={20} />
          <h2>Settings</h2>
        </div>
        <p>Choose what the app should care about. You can keep it lift-only, or turn on body weight and intake recommendations when you want the full workflow.</p>
      </section>

      <section className="panel">
        <div className="settings-section-head">
          <h2>Tracking mode</h2>
          <span>{modeLabel(state.trackingMode)}</span>
        </div>
        <div className="mode-choice-grid">
          {TRACKING_MODES.map((mode) => (
            <ModeChoice key={mode.id} mode={mode} selected={state.trackingMode === mode.id} onClick={() => setTrackingMode(mode.id)} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="settings-section-head">
          <h2>Units</h2>
          <span>{state.unit === 'metric' ? 'Kilograms' : 'Pounds'}</span>
        </div>
        <div className="settings-segment" role="group" aria-label="Weight units">
          <button className={state.unit === 'imperial' ? 'active' : ''} type="button" onClick={() => setUnit('imperial')}>
            lb
          </button>
          <button className={state.unit === 'metric' ? 'active' : ''} type="button" onClick={() => setUnit('metric')}>
            kg
          </button>
        </div>
      </section>
    </section>
  );
}

export function ModeChoice({ mode, selected, onClick }) {
  const Icon = mode.icon;
  return (
    <button type="button" className={`mode-choice ${selected ? 'selected' : ''}`} onClick={onClick} aria-pressed={selected}>
      <span className="mode-choice-icon">
        <Icon size={22} />
      </span>
      <span>
        <strong>{mode.title}</strong>
        <small>{mode.detail}</small>
      </span>
    </button>
  );
}

export function modeLabel(mode) {
  return mode === 'lifts' ? 'Just Lifts' : 'Calories, Weights, and Lifts';
}

export default SettingsView;
