import React from 'react';
import { CalendarDays, Scale, Utensils } from 'lucide-react';
import TrendChart from '../components/TrendChart';
import { bodyWeightChartPoints, calorieChartPoints } from '../domain/trends';
import { formatWeight } from '../utils/units';

function WeightView({ addCalories, addWeight, calorieEntry, intakeAverage, setCalorieEntry, setWeightEntry, state, todayCalories, weightEntry }) {
  const weightPoints = bodyWeightChartPoints(state.bodyWeights);
  const caloriePoints = calorieChartPoints(state.calorieEntries || []);

  return (
    <section className="stack">
      <section className="weight-log-grid">
        <article className="panel">
          <div className="panel-title">
            <Scale size={20} />
            <h2>Body weight</h2>
          </div>
          <div className="form-grid">
            <label>
              Date
              <input type="date" autoComplete="off" value={weightEntry.date} onChange={(event) => setWeightEntry({ ...weightEntry, date: event.target.value })} />
            </label>
            <label>
              Weight
              <input
                type="number"
                inputMode="decimal"
                autoComplete="off"
                placeholder={state.unit === 'metric' ? 'kg' : 'lb'}
                value={weightEntry.weight}
                onChange={(event) => setWeightEntry({ ...weightEntry, weight: event.target.value })}
              />
            </label>
          </div>
          <button onClick={addWeight}>Save weigh-in</button>
        </article>

        <article className="panel intake-panel">
          <div className="panel-title">
            <Utensils size={20} />
            <h2>Calories</h2>
          </div>
          <div className="intake-average">
            <span>7-day average</span>
            <strong>{intakeAverage ? `${Math.round(intakeAverage.average).toLocaleString()} cal` : 'Need logs'}</strong>
            <small>{intakeAverage ? `${intakeAverage.days} logged day${intakeAverage.days === 1 ? '' : 's'}` : 'Log daily totals to replace guesswork.'}</small>
          </div>
          <div className={`today-calorie-target ${todayCalories?.isCapped ? 'high' : ''}`}>
            <span>Suggested today</span>
            <strong>{todayCalories ? `${todayCalories.recommendedCalories.toLocaleString()} cal` : 'Set target'}</strong>
            <small>{todayTargetDetail(todayCalories)}</small>
          </div>
          <div className="form-grid">
            <label>
              Date
              <input type="date" autoComplete="off" value={calorieEntry.date} onChange={(event) => setCalorieEntry({ ...calorieEntry, date: event.target.value })} />
            </label>
            <label>
              Calories
              <input
                type="number"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Total"
                value={calorieEntry.calories}
                onChange={(event) => setCalorieEntry({ ...calorieEntry, calories: event.target.value })}
              />
            </label>
          </div>
          <button onClick={addCalories}>Save calories</button>
        </article>
      </section>

      <section className="body-chart-grid">
        <article className="panel">
          <TrendChart
            title="Calorie intake trend"
            points={caloriePoints}
            valueFormatter={(value) => `${Math.round(value).toLocaleString()} cal`}
            rawLabel="Daily total"
            averageLabel="7-day avg"
          />
        </article>

        <article className="panel">
          <TrendChart
            title="Body weight trend"
            points={weightPoints}
            valueFormatter={(value) => formatWeight(value, state.unit)}
            rawLabel="Weigh-in"
            averageLabel="Moving avg"
          />
        </article>
      </section>

      <section className="body-data-grid">
        <article className="panel data-panel">
          <div className="panel-title">
            <CalendarDays size={20} />
            <h2>Recent calories</h2>
          </div>
          <div className="simple-list scroll-list">
            {(!state.calorieEntries || state.calorieEntries.length === 0) && <p className="empty">No calorie totals logged yet.</p>}
            {(state.calorieEntries || []).map((entry) => (
              <div className="simple-row" key={entry.id}>
                <span>{entry.date}</span>
                <strong>{Math.round(entry.calories).toLocaleString()} cal</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel data-panel">
          <div className="panel-title">
            <CalendarDays size={20} />
            <h2>Recent weigh-ins</h2>
          </div>
          <div className="simple-list scroll-list">
            {state.bodyWeights.length === 0 && <p className="empty">No weigh-ins yet.</p>}
            {state.bodyWeights.map((entry) => (
              <div className="simple-row" key={entry.id}>
                <span>{entry.date}</span>
                <strong>{formatWeight(entry.weight, state.unit)}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}

function todayTargetDetail(target) {
  if (!target) return 'Set a daily target first.';
  if (target.todayLogged !== null) {
    return `You logged ${Math.round(target.todayLogged).toLocaleString()} today. Projected average: ${Math.round(target.projectedAverage).toLocaleString()}.`;
  }
  if (!target.isCompleteWindow) {
    return `${target.previousDays}/6 prior days logged. More complete logs make this smarter.`;
  }
  if (target.isCapped) {
    return `Exact weekly catch-up would be ${target.exactCatchUpCalories.toLocaleString()}, so this is capped near your current target.`;
  }
  return `Small rolling adjustment around your ${Math.round(target.target).toLocaleString()} target.`;
}

export default WeightView;
