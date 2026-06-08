import React from 'react';
import { Activity, ArrowUpRight, BarChart3, CalendarDays, Utensils } from 'lucide-react';
import { ModeChoice, TRACKING_MODES } from './SettingsView';

function OnboardingTutorial({ selectedMode, setSelectedMode, onComplete }) {
  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <section className="tutorial-panel">
        <div className="tutorial-copy">
          <p className="eyebrow">First run</p>
          <h1 id="tutorial-title">Set up the tracker around how you actually log.</h1>
          <p>
            This app compares body-weight trend with comparable gym performance. You can run it as a pure lifting log, or include intake and weigh-ins
            when you want recommendation logic.
          </p>
        </div>

        <div className="tutorial-bento" aria-label="How the app works">
          <article>
            <Activity size={20} />
            <strong>Log top sets</strong>
            <span>Weight, reps, and RIR stay separate so performance is not flattened into a fake score.</span>
          </article>
          <article>
            <BarChart3 size={20} />
            <strong>Compare fairly</strong>
            <span>Exercise trends can be reviewed across all sessions or within one split.</span>
          </article>
          <article>
            <CalendarDays size={20} />
            <strong>Use cycles</strong>
            <span>Archive training blocks when your split or exercise order materially changes.</span>
          </article>
          <article>
            <Utensils size={20} />
            <strong>Add nutrition later</strong>
            <span>Full mode adds body weight, daily target, and intake recommendations.</span>
          </article>
        </div>

        <div className="tutorial-actions">
          <div>
            <h2>What do you want to track?</h2>
            <p>You can change this any time in Settings.</p>
          </div>
          <div className="mode-choice-grid">
            {TRACKING_MODES.map((mode) => (
              <ModeChoice key={mode.id} mode={mode} selected={selectedMode === mode.id} onClick={() => setSelectedMode(mode.id)} />
            ))}
          </div>
          <button className="primary-cta tutorial-start" type="button" onClick={onComplete}>
            <span>Start tracking</span>
            <span className="cta-icon">
              <ArrowUpRight size={16} />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

export default OnboardingTutorial;
