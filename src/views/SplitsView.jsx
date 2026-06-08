import React from 'react';
import { Archive, CalendarDays, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { displayExercise, exerciseName } from '../domain/exerciseConfig';

function SplitsView({
  addCustomExercise,
  addSplitExercise,
  allExercises,
  archiveCurrentCycle,
  customExercise,
  deleteArchivedCycle,
  setCustomExercise,
  setSplitEntry,
  splitEntry,
  state,
  unarchiveCycle,
  updateState,
}) {
  const activeCycle = state.cycles.find((cycle) => cycle.id === state.activeCycleId);
  const archivedCycles = state.cycles.filter((cycle) => cycle.archived);

  return (
    <section className="stack">
      <section className="panel cycle-panel">
        <div className="panel-title">
          <Archive size={20} />
          <h2>Training cycle</h2>
        </div>
        <div className="cycle-summary">
          <div>
            <span>Active cycle</span>
            <strong>{activeCycle?.name || 'Current cycle'}</strong>
            <small>Started {activeCycle?.startDate || 'today'}</small>
          </div>
          <div>
            <span>Archived cycles</span>
            <strong>{archivedCycles.length}</strong>
            <small>Saved for historical comparisons</small>
          </div>
          <button className="secondary" onClick={archiveCurrentCycle}>
            <Archive size={18} />
            Archive and start new
          </button>
        </div>
      </section>

      {archivedCycles.length > 0 && (
        <section className="panel">
          <div className="panel-title">
            <RotateCcw size={20} />
            <h2>Archived cycles</h2>
          </div>
          <div className="cycle-list">
            {archivedCycles.map((cycle) => (
              <div className="cycle-row" key={cycle.id}>
                <div>
                  <strong>{cycle.name}</strong>
                  <span>
                    {cycle.startDate || 'Unknown start'} to {cycle.endDate || 'unknown end'}
                  </span>
                </div>
                <button className="secondary" onClick={() => unarchiveCycle(cycle.id)}>
                  <RotateCcw size={18} />
                  Restore
                </button>
                <button className="danger-button" onClick={() => deleteArchivedCycle(cycle.id)}>
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-title">
          <CalendarDays size={20} />
          <h2>Create splits</h2>
        </div>
        <div className="form-grid split-builder">
          <label>
            Split name
            <input value={splitEntry.name} placeholder="Upper B" onChange={(event) => setSplitEntry({ ...splitEntry, name: event.target.value })} />
          </label>
          <label>
            Exercise
            <select value={splitEntry.exercise} onChange={(event) => setSplitEntry({ ...splitEntry, exercise: event.target.value })}>
              {allExercises.map((exercise) => (
                <option value={exercise} key={exercise}>
                  {exercise}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rep min
            <input type="number" min="1" value={splitEntry.repMin} onChange={(event) => setSplitEntry({ ...splitEntry, repMin: event.target.value })} />
          </label>
          <label>
            Rep max
            <input type="number" min="1" value={splitEntry.repMax} onChange={(event) => setSplitEntry({ ...splitEntry, repMax: event.target.value })} />
          </label>
          <button onClick={addSplitExercise}>Add to split</button>
        </div>
        <div className="inline-add">
          <input value={customExercise} placeholder="Custom exercise" onChange={(event) => setCustomExercise(event.target.value)} />
          <button className="secondary" onClick={addCustomExercise}>
            <Plus size={18} />
            Add exercise
          </button>
        </div>
      </section>

      <section className="split-grid">
        {state.splits.map((split) => (
          <article className="panel" key={split.id}>
            <div className="split-title">
              <h2>{split.name}</h2>
              <button className="icon-only" title="Delete split" onClick={() => updateState((current) => ({ ...current, splits: current.splits.filter((item) => item.id !== split.id) }))}>
                <Trash2 size={18} />
              </button>
            </div>
            <div className="exercise-tags">
              {split.exercises.map((exercise) => (
                <span key={exerciseName(exercise)}>{displayExercise(exercise)}</span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

export default SplitsView;
