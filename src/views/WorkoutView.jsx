import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Dumbbell, Info, Plus, Trash2 } from 'lucide-react';
import ComparisonCard from '../components/ComparisonCard';
import History from '../components/History';
import { cycleExerciseBreakdown } from '../domain/cycleMetrics';
import { createId } from '../utils/id';

function WorkoutView({ addSet, saveWorkout, selectedSplitExercises, setWorkoutEntry, state, workoutEntry }) {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const exercises = selectedSplitExercises();
  const boundedIndex = Math.min(exerciseIndex, Math.max(0, exercises.length - 1));
  const currentExercise = exercises[boundedIndex] || '';
  const currentSets = workoutEntry.sets.filter((set) => set.exercise === currentExercise);
  const breakdown = useMemo(() => cycleExerciseBreakdown(state, [currentExercise])[0], [currentExercise, state]);

  function updateSet(setId, patch) {
    setWorkoutEntry({
      ...workoutEntry,
      sets: workoutEntry.sets.map((item) => (item.id === setId ? { ...item, ...patch } : item)),
    });
  }

  function changeSplit(splitId) {
    const split = state.splits.find((item) => item.id === splitId);
    setExerciseIndex(0);
    setWorkoutEntry({
      ...workoutEntry,
      splitId,
      sets: [newWorkoutSet(split?.exercises[0] || '')],
    });
  }

  function nextExercise() {
    setExerciseIndex((index) => Math.min(index + 1, exercises.length - 1));
  }

  function previousExercise() {
    setExerciseIndex((index) => Math.max(index - 1, 0));
  }

  return (
    <section className="stack">
      <section className="panel workout-flow">
        <div className="panel-title">
          <Dumbbell size={20} />
          <h2>Start workout</h2>
        </div>
        <div className="form-grid">
          <label>
            Date
            <input type="date" value={workoutEntry.date} onChange={(event) => setWorkoutEntry({ ...workoutEntry, date: event.target.value })} />
          </label>
          <label>
            Workout day
            <select value={workoutEntry.splitId} onChange={(event) => changeSplit(event.target.value)}>
              {state.splits.map((split) => (
                <option value={split.id} key={split.id}>
                  {split.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="exercise-stepper">
          <button className="secondary" onClick={previousExercise} disabled={boundedIndex === 0}>
            <ArrowLeft size={18} />
            Previous
          </button>
          <div>
            <span>
              Exercise {boundedIndex + 1} of {exercises.length}
            </span>
            <strong>{currentExercise}</strong>
          </div>
          <button className="secondary" onClick={nextExercise} disabled={boundedIndex >= exercises.length - 1}>
            Next
            <ArrowRight size={18} />
          </button>
        </div>

        <section className="exercise-context">
          <ComparisonCard title="Current" set={breakdown?.current} unit={state.unit} />
          <ComparisonCard title="Vs last week" comparison={breakdown?.lastWeek} unit={state.unit} />
          <ComparisonCard title="Vs cycle start" comparison={breakdown?.start} unit={state.unit} />
          <ComparisonCard title="Vs current peak" comparison={breakdown?.currentPeak} unit={state.unit} />
          <ComparisonCard title="Vs previous peak" comparison={breakdown?.previousPeak} unit={state.unit} />
        </section>

        <div className="set-header">
          <span>Load</span>
          <span>Reps</span>
          <span>
            RIR
            <small>Reps in reserve</small>
          </span>
          <span></span>
        </div>
        <div className="set-list">
          {currentSets.length === 0 && <p className="empty">No sets added for {currentExercise} yet.</p>}
          {currentSets.map((set) => (
            <div className="set-row compact" key={set.id}>
              <input
                type="number"
                inputMode="decimal"
                placeholder={state.unit === 'metric' ? 'kg' : 'lb'}
                value={set.weight}
                onChange={(event) => updateSet(set.id, { weight: event.target.value })}
              />
              <input type="number" inputMode="numeric" placeholder="Reps" value={set.reps} onChange={(event) => updateSet(set.id, { reps: event.target.value })} />
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="10"
                placeholder="RIR"
                title="RIR means reps in reserve: how many more reps you could have done."
                value={set.rir}
                onChange={(event) => updateSet(set.id, { rir: event.target.value })}
              />
              <button className="icon-only" title="Remove set" onClick={() => setWorkoutEntry({ ...workoutEntry, sets: workoutEntry.sets.filter((item) => item.id !== set.id) })}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="actions">
          <button className="secondary" onClick={() => addSet(currentExercise)}>
            <Plus size={18} />
            Add set for {currentExercise}
          </button>
        </div>

        <p className="inline-help">
          <Info size={16} />
          RIR means reps in reserve. Lower RIR is harder: 0 RIR is failure, 2 RIR means you had about two reps left.
        </p>

        <label className="check-row">
          <input
            type="checkbox"
            checked={workoutEntry.extenuating}
            onChange={(event) => setWorkoutEntry({ ...workoutEntry, extenuating: event.target.checked })}
          />
          Performance affected by sleep, illness, hangover, travel, stress, or another factor
        </label>
        {workoutEntry.extenuating && (
          <input
            className="full-input"
            placeholder="Optional note"
            value={workoutEntry.reason}
            onChange={(event) => setWorkoutEntry({ ...workoutEntry, reason: event.target.value })}
          />
        )}

        <div className="actions">
          <button onClick={saveWorkout}>Save workout</button>
        </div>
      </section>

      <History workouts={state.workouts} unit={state.unit} />
    </section>
  );
}

function newWorkoutSet(exercise) {
  return { id: createId(), exercise, weight: '', reps: '', rir: '' };
}

export default WorkoutView;
