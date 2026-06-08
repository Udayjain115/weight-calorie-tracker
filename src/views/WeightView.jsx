import React from 'react';
import { CalendarDays, Scale } from 'lucide-react';
import TrendChart from '../components/TrendChart';
import { bodyWeightChartPoints } from '../domain/trends';
import { formatWeight } from '../utils/units';

function WeightView({ addWeight, setWeightEntry, state, weightEntry }) {
  const weightPoints = bodyWeightChartPoints(state.bodyWeights);

  return (
    <section className="stack">
      <section className="panel">
        <div className="panel-title">
          <Scale size={20} />
          <h2>Body weight</h2>
        </div>
        <div className="form-grid">
          <label>
            Date
            <input type="date" value={weightEntry.date} onChange={(event) => setWeightEntry({ ...weightEntry, date: event.target.value })} />
          </label>
          <label>
            Weight
            <input
              type="number"
              inputMode="decimal"
              placeholder={state.unit === 'metric' ? 'kg' : 'lb'}
              value={weightEntry.weight}
              onChange={(event) => setWeightEntry({ ...weightEntry, weight: event.target.value })}
            />
          </label>
        </div>
        <button onClick={addWeight}>Save weigh-in</button>
      </section>

      <section className="panel">
        <TrendChart
          title="Body weight raw values and moving average"
          points={weightPoints}
          valueFormatter={(value) => formatWeight(value, state.unit)}
          rawLabel="Weigh-in"
          averageLabel="Moving avg"
        />
      </section>

      <section className="panel">
        <div className="panel-title">
          <CalendarDays size={20} />
          <h2>Recent weigh-ins</h2>
        </div>
        <div className="simple-list">
          {state.bodyWeights.length === 0 && <p className="empty">No weigh-ins yet.</p>}
          {state.bodyWeights.map((entry) => (
            <div className="simple-row" key={entry.id}>
              <span>{entry.date}</span>
              <strong>{formatWeight(entry.weight, state.unit)}</strong>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export default WeightView;
