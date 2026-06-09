import React from 'react';
import { Activity, AlertTriangle, CalendarDays, Flame, Moon, Scale, Utensils } from 'lucide-react';
import ComparisonCard from '../components/ComparisonCard';
import TrendChart from '../components/TrendChart';
import { cycleExerciseBreakdown } from '../domain/cycleMetrics';
import { bodyWeightChartPoints, exerciseChartPoints, exerciseProgressionRows } from '../domain/trends';
import { formatWeight } from '../utils/units';

function DashboardView({
  allExercises,
  clearMockData,
  exerciseScope,
  extenuatingCount,
  guidance,
  selectedExercise,
  setExerciseScope,
  setSelectedExercise,
  state,
  strengthAlerts,
  trend,
  intakeAverage,
  todayCalories,
  trackingMode,
  updateCalories,
  updateGoalMode,
}) {
  const isLiftOnly = trackingMode === 'lifts';
  const weightPoints = bodyWeightChartPoints(state.bodyWeights);
  const exercisePoints = selectedExercise ? exerciseChartPoints(state.workouts, selectedExercise, exerciseScope) : [];
  const progressionRows = selectedExercise ? exerciseProgressionRows(state.workouts, selectedExercise, exerciseScope) : [];
  const cycleRows = cycleExerciseBreakdown(state, allExercises);
  const activeSplitName = state.splits.find((split) => split.id === exerciseScope.splitId)?.name || 'selected workout';

  return (
    <section className={`dashboard-grid ${isLiftOnly ? 'lift-dashboard' : ''}`}>
      {state.hasMockData && !isLiftOnly && (
        <section className="mock-banner wide">
          <div>
            <strong>Mock data is loaded</strong>
            <span>About one month of sample weigh-ins and workouts is being shown so the charts and alerts have something to work with.</span>
          </div>
          <button className="secondary" onClick={clearMockData}>
            Clear mock data
          </button>
        </section>
      )}

      <section className="dashboard-summary wide">
        {isLiftOnly ? (
          <article className="guidance lift-brief success">
            <div className="guidance-heading">
              <DumbbellMark />
              <span>Lift focus</span>
            </div>
            <h2>Train. Compare. Adjust.</h2>
            <p>Lift-only mode keeps the app centered on workouts, comparable top sets, exercise trends, and training cycles.</p>
          </article>
        ) : (
          <article className={`guidance ${guidance.tone}`}>
            <div className="guidance-heading">
              <Utensils size={22} />
              <span>Recommendation</span>
            </div>
            <h2>{guidance.label}</h2>
            <p>{guidance.detail}</p>
            <p className="actual-intake-note">
              {intakeAverage
                ? `Your logged 7-day average is ${Math.round(intakeAverage.average).toLocaleString()} calories/day. Use that as the real baseline.`
                : 'Log daily calorie totals to use your real intake instead of the target.'}
            </p>
            <div className="dashboard-controls">
              <label className="calorie-input">
                Goal mode
                <select value={state.goalMode} onChange={(event) => updateGoalMode(event.target.value)}>
                  {DIET_MODES.map((mode) => (
                    <option value={mode.id} key={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="calorie-input">
                Daily target
                <input
                  type="number"
                  inputMode="numeric"
                  autoComplete="off"
                  value={state.calories}
                  onChange={(event) => updateCalories(Number(event.target.value))}
                />
              </label>
            </div>
            <p className="diet-mode-note">{DIET_MODES.find((mode) => mode.id === state.goalMode)?.detail}</p>
          </article>
        )}

        <aside className="dashboard-stats-panel">
          {!isLiftOnly && (
            <div className="recommended-calories-card compact">
              <div className="guidance-heading">
                <Flame size={22} />
                <span>Today</span>
              </div>
              <h2>{todayCalories ? todayCalories.recommendedCalories.toLocaleString() : 'Set target'}</h2>
              <p>Recommended calories</p>
              <small>{todayTargetDetail(todayCalories)}</small>
            </div>
          )}
          <div className="summary-stat-grid">
            {!isLiftOnly && (
              <>
                <SummaryStat
                  icon={<Scale size={18} />}
                  label="14-day average"
                  value={trend ? formatWeight(trend.average, state.unit) : 'Need data'}
                  detail={trend ? `${trend.weeklyChange >= 0 ? '+' : ''}${trend.weeklyChange.toFixed(2)} lb/week` : 'Log at least two weigh-ins'}
                />
                <SummaryStat
                  icon={<Flame size={18} />}
                  label="7-day intake"
                  value={intakeAverage ? Math.round(intakeAverage.average).toLocaleString() : 'Need logs'}
                  detail={intakeAverage ? `${intakeAverage.days} logged day${intakeAverage.days === 1 ? '' : 's'}` : 'Log calorie totals'}
                />
              </>
            )}
            <SummaryStat
              icon={<Activity size={18} />}
              label="Strength alerts"
              value={strengthAlerts.length}
              detail={strengthAlerts.length ? 'Comparable performance declined' : 'No confirmed decline'}
            />
            <SummaryStat
              icon={<Moon size={18} />}
              label={isLiftOnly ? 'Context flags' : 'Flagged sessions'}
              value={extenuatingCount}
              detail={isLiftOnly ? 'Kept visible in history' : 'Excluded from upward fuel changes'}
            />
          </div>
        </aside>
      </section>

      {!isLiftOnly && (
        <section className="panel wide">
          <TrendChart
            title="Body weight trend"
            points={weightPoints}
            valueFormatter={(value) => formatWeight(value, state.unit)}
            rawLabel="Weigh-in"
            averageLabel="Moving avg"
          />
        </section>
      )}

      <section className="panel wide">
        <div className="chart-toolbar">
          <div className="panel-title">
            <Activity size={20} />
            <h2>Exercise trend</h2>
          </div>
          <div className="exercise-controls">
            <select value={selectedExercise} onChange={(event) => setSelectedExercise(event.target.value)}>
              {allExercises.map((exercise) => (
                <option value={exercise} key={exercise}>
                  {exercise}
                </option>
              ))}
            </select>
            <div className="scope-controls" role="group" aria-label="Exercise comparison scope">
              <button
                className={exerciseScope.mode === 'all' ? 'active' : ''}
                onClick={() => setExerciseScope((current) => ({ ...current, mode: 'all' }))}
              >
                All sessions
              </button>
              <button
                className={exerciseScope.mode === 'split' ? 'active' : ''}
                onClick={() => setExerciseScope((current) => ({ ...current, mode: 'split', splitId: current.splitId || state.splits[0]?.id || '' }))}
              >
                Specific workout
              </button>
            </div>
            {exerciseScope.mode === 'split' && (
              <select
                value={exerciseScope.splitId}
                onChange={(event) => setExerciseScope((current) => ({ ...current, splitId: event.target.value }))}
              >
                {state.splits.map((split) => (
                  <option value={split.id} key={split.id}>
                    {split.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <TrendChart
          title={`${selectedExercise} load trend${exerciseScope.mode === 'split' ? ` in ${activeSplitName}` : ''}`}
          points={exercisePoints}
          valueFormatter={(value) => formatWeight(value, state.unit)}
          rawLabel="Top set load"
          averageLabel="Moving avg"
        />
        <p className="chart-note">
          All sessions shows the broad trend. Specific workout compares the same exercise only within one split, which helps account for exercise order and fatigue.
        </p>
      </section>

      <section className="panel wide">
        <div className="panel-title">
          <AlertTriangle size={20} />
          <h2>Exercise watchlist</h2>
        </div>
        {strengthAlerts.length === 0 ? (
          <p className="empty">No exercise is below its valid recent peak in the latest rolling window.</p>
        ) : (
          <div className="alert-list">
            {strengthAlerts.map((alert) => (
              <div className="alert-row" key={alert.exercise}>
                <strong>{alert.exercise}</strong>
                <span>
                  Valid peak: {formatWeight(alert.previousBest.weight, state.unit)} x {alert.previousBest.reps} RIR {alert.previousBest.rir}. Current:{' '}
                  {formatWeight(alert.currentBest.weight, state.unit)} x {alert.currentBest.reps} RIR {alert.currentBest.rir}. {alert.reason}
                  {alert.belowRepRange && ' Current set is below its rep range, so it is not counted as a new peak.'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel wide">
        <div className="panel-title">
          <CalendarDays size={20} />
          <h2>{exerciseScope.mode === 'split' ? `Progression in ${activeSplitName}` : 'Across-session progression'}</h2>
        </div>
        <ProgressionTable rows={progressionRows} unit={state.unit} />
        <p className="chart-note">
          Load increases are treated as progress even if reps dip. At the same load, higher reps or the same reps with more RIR indicate improvement.
        </p>
      </section>

      <section className="panel wide">
        <div className="panel-title">
          <Activity size={20} />
          <h2>Active cycle exercise breakdown</h2>
        </div>
        <CycleBreakdownTable rows={cycleRows} unit={state.unit} />
        <p className="chart-note">Green marks an improved top set, red marks a decline, and grey means the current top set matches the comparison point. Previous peak compares against the best top set from the most recently archived cycle.</p>
      </section>

      <section className="panel wide">
        <div className="panel-title">
          <CalendarDays size={20} />
          <h2>Latest raw exercise values</h2>
        </div>
        <div className="simple-list raw-values-list">
          {exercisePoints.length === 0 && <p className="empty">No sets logged for this exercise yet.</p>}
          {exercisePoints
            .slice()
            .reverse()
            .slice(0, 8)
            .map((point) => (
              <div className="simple-row raw-value-row" key={point.id}>
                <span className="raw-value-date">{point.date}</span>
                <strong className="raw-value-set">
                  {formatWeight(point.weight, state.unit)} x {point.reps}, RIR {point.rir}
                </strong>
                <span className={`raw-value-status ${point.extenuating ? 'flagged' : ''}`}>{point.extenuating ? 'Flagged session' : 'Valid session'}</span>
              </div>
            ))}
        </div>
      </section>
    </section>
  );
}

function formatDelta(value, formatter) {
  if (value === null || value === undefined) return 'Start';
  if (Math.abs(value) < 0.01) return 'No change';
  const prefix = value > 0 ? '+' : '';
  return prefix + formatter(value);
}

function SummaryStat({ detail, icon, label, value }) {
  return (
    <article className="summary-stat">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

const DIET_MODES = [
  {
    id: 'maingain',
    label: 'Standard maingain',
    detail: 'Hold when weight is stable or drifting 0.25-0.5 lb with solid performance. Increase if strength drops or weight falls two weeks in a row.',
  },
  {
    id: 'small_deficit',
    label: 'Small deficit',
    detail: 'Slow weight loss is acceptable if strength is steady or improving. Increase only when performance drops; decrease on 1+ lb gain.',
  },
];

function todayTargetDetail(target) {
  if (!target) return 'Set a daily calorie target to calculate today.';
  if (target.todayLogged !== null) {
    return `You logged ${Math.round(target.todayLogged).toLocaleString()} today. Projected weekly average: ${Math.round(target.projectedAverage).toLocaleString()}.`;
  }
  if (!target.isCompleteWindow) {
    return `${target.previousDays}/6 prior days logged. This gets more accurate with a full rolling week.`;
  }
  if (target.isCapped) {
    return `Exact catch-up would be ${target.exactCatchUpCalories.toLocaleString()}, so this is capped near your current target.`;
  }
  return `Small rolling adjustment around your ${Math.round(target.target).toLocaleString()} target.`;
}

function ProgressionTable({ rows, unit }) {
  return (
    <ProgressTable
      className="progression-table"
      columns={['Date', 'Workout', 'Top set', 'Load', 'Reps', 'RIR', 'Status']}
      emptyMessage="No sets logged for this exercise yet."
      rows={rows.slice().reverse().slice(0, 10)}
      renderRow={(point) => <ProgressionRow point={point} unit={unit} />}
    />
  );
}

function ProgressionRow({ point, unit }) {
  return (
    <tr>
      <td data-label="Date">{point.date}</td>
      <td data-label="Workout">{point.splitName}</td>
      <td data-label="Top set">
        <strong>
          {formatWeight(point.weight, unit)} x {point.reps}
        </strong>
      </td>
      <td data-label="Load">{formatDelta(point.loadDelta, (value) => formatWeight(value, unit))}</td>
      <td data-label="Reps">{formatDelta(point.repsDelta, (value) => `${value} reps`)}</td>
      <td data-label="RIR">{formatDelta(point.rirDelta, (value) => `${value} RIR`)}</td>
      <td data-label="Status">
        <span className={`status-pill ${point.tone}`}>{point.status}</span>
        {point.extenuating && <span className="flag-note">Flagged</span>}
      </td>
    </tr>
  );
}

function CycleBreakdownTable({ rows, unit }) {
  return (
    <ProgressTable
      className="cycle-breakdown-table"
      columns={['Exercise', 'Current', 'Vs last week', 'Vs cycle start', 'Vs current peak', 'Vs previous peak']}
      emptyMessage="Log workouts in the active cycle to see exercise comparisons."
      rows={rows}
      renderRow={(row) => <CycleBreakdownRow row={row} unit={unit} />}
    />
  );
}

function CycleBreakdownRow({ row, unit }) {
  return (
    <tr>
      <td data-label="Exercise">
        <strong>{row.exercise}</strong>
      </td>
      <td data-label="Current">
        {formatWeight(row.current.weight, unit)} x {row.current.reps}, RIR {row.current.rir}
      </td>
      <td data-label="Vs last week">
        <ComparisonCard title="Last week" comparison={row.lastWeek} unit={unit} compact />
      </td>
      <td data-label="Vs cycle start">
        <ComparisonCard title="Cycle start" comparison={row.start} unit={unit} compact />
      </td>
      <td data-label="Vs current peak">
        <ComparisonCard title="Current peak" comparison={row.currentPeak} unit={unit} compact />
      </td>
      <td data-label="Vs previous peak">
        <ComparisonCard
          title="Previous peak"
          comparison={row.previousPeak}
          unit={unit}
          missingLabel={row.previousCycleName ? `No ${row.previousCycleName} data` : 'No previous cycle'}
          compact
        />
      </td>
    </tr>
  );
}

function ProgressTable({ className = '', columns, emptyMessage, rows, renderRow }) {
  if (rows.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }

  return (
    <div className="progress-table-wrap">
      <table className={`progress-table ${className}`.trim()}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map((row) => React.cloneElement(renderRow(row), { key: row.id || row.exercise }))}</tbody>
      </table>
    </div>
  );
}

export default DashboardView;

function DumbbellMark() {
  return <Activity size={22} />;
}
