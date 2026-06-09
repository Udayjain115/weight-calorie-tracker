import React from 'react';
import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { formatWeight } from '../utils/units';

function History({ onDeleteWorkout, onEditWorkout, workouts, unit }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <CalendarDays size={20} />
        <h2>Workout history</h2>
      </div>
      {workouts.length === 0 && <p className="empty">No workouts yet.</p>}
      <div className="history-list">
        {workouts.map((workout) => (
          <article className="history-row" key={workout.id}>
            <div className="history-meta">
              <strong>{workout.splitName}</strong>
              <span>{workout.date}</span>
              {workout.extenuating && <em>{workout.reason}</em>}
              {workout.strengthFlag && (
                <em className="strength-flag">
                  Strength down on {workout.strengthSummary?.losingExerciseCount || 0}/{workout.strengthSummary?.comparedExerciseCount || 0} comparable exercises
                </em>
              )}
            </div>
            <div className="mini-sets">
              {workout.sets.map((set, index) => (
                <span key={`${workout.id}-${index}`}>
                  {set.exercise}: {formatWeight(set.weight, unit)} x {set.reps}, RIR {set.rir}
                  {workout.setStrengthFlags?.[index]?.status && workout.setStrengthFlags[index].status !== 'no_baseline' && (
                    <b className={`set-strength ${workout.setStrengthFlags[index].status}`}>
                      {workout.setStrengthFlags[index].status === 'loss' ? 'Down' : workout.setStrengthFlags[index].status === 'gain' ? 'Up' : 'Match'}
                    </b>
                  )}
                  {workout.setStrengthFlags?.[index]?.belowRepRange && <b className="set-strength range">Below range</b>}
                </span>
              ))}
            </div>
            <div className="history-actions" aria-label={`${workout.splitName} workout actions`}>
              <button className="icon-only" title="Edit workout" onClick={() => onEditWorkout?.(workout)}>
                <Pencil size={17} />
              </button>
              <button className="icon-only danger-icon" title="Delete workout" onClick={() => onDeleteWorkout?.(workout.id)}>
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default History;
