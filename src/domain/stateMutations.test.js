import { describe, expect, it } from 'vitest';
import {
  deleteArchivedCycle,
  deleteSplit,
  insertAt,
  removeSplitExercise,
  restoreArchivedCycle,
  restoreSplit,
  restoreSplitExercise,
} from './stateMutations.js';

const upperA = {
  id: 'upper-a',
  name: 'Upper A',
  exercises: [{ name: 'Bench Press', repMin: 4, repMax: 8 }, 'Row', 'Lat Pulldown'],
};

const lowerA = {
  id: 'lower-a',
  name: 'Lower A',
  exercises: ['Squat', 'Leg Curl'],
};

function state() {
  return {
    splits: [upperA, lowerA],
    cycles: [
      { id: 'cycle-1', name: 'Cycle 1', archived: false },
      { id: 'cycle-0', name: 'Cycle 0', archived: true },
    ],
    workouts: [
      { id: 'newer-active', date: '2026-06-07', cycleId: 'cycle-1' },
      { id: 'older-archived', date: '2026-05-20', cycleId: 'cycle-0' },
      { id: 'newer-archived', date: '2026-05-27', cycleId: 'cycle-0' },
    ],
  };
}

describe('split exercise delete and undo state', () => {
  it('removes a specific configured exercise from a split without deleting the split or other exercises', () => {
    const next = removeSplitExercise(state(), 'upper-a', 'Bench Press');

    expect(next.splits).toHaveLength(2);
    expect(next.splits.find((split) => split.id === 'upper-a')).toMatchObject({
      name: 'Upper A',
      exercises: ['Row', 'Lat Pulldown'],
    });
    expect(next.splits.find((split) => split.id === 'lower-a').exercises).toEqual(['Squat', 'Leg Curl']);
  });

  it('restores a removed exercise at its original position and preserves its rep-range settings', () => {
    const deletedExercise = upperA.exercises[0];
    const deleted = removeSplitExercise(state(), 'upper-a', 'Bench Press');
    const restored = restoreSplitExercise(deleted, 'upper-a', 'Bench Press', 0, deletedExercise);

    expect(restored.splits.find((split) => split.id === 'upper-a').exercises).toEqual(upperA.exercises);
  });

  it('does not duplicate an exercise if undo runs after the same exercise was re-added manually', () => {
    const deleted = removeSplitExercise(state(), 'upper-a', 'Row');
    const manuallyReadded = {
      ...deleted,
      splits: deleted.splits.map((split) => (split.id === 'upper-a' ? { ...split, exercises: [...split.exercises, 'Row'] } : split)),
    };

    const restored = restoreSplitExercise(manuallyReadded, 'upper-a', 'Row', 1, 'Row');

    expect(restored.splits.find((split) => split.id === 'upper-a').exercises).toEqual([
      { name: 'Bench Press', repMin: 4, repMax: 8 },
      'Row',
      'Lat Pulldown',
    ]);
  });
});

describe('split delete and undo state', () => {
  it('deletes only the selected split', () => {
    const next = deleteSplit(state(), 'upper-a');

    expect(next.splits).toEqual([lowerA]);
  });

  it('restores a deleted split to its original order without duplicating existing copies', () => {
    const deleted = deleteSplit(state(), 'upper-a');
    const restored = restoreSplit(deleted, upperA, 0);
    const restoredAgain = restoreSplit(restored, upperA, 0);

    expect(restoredAgain.splits).toEqual([upperA, lowerA]);
  });
});

describe('archived cycle delete and undo state', () => {
  it('deletes an archived cycle and only that cycle workout history', () => {
    const next = deleteArchivedCycle(state(), 'cycle-0');

    expect(next.cycles.map((cycle) => cycle.id)).toEqual(['cycle-1']);
    expect(next.workouts.map((workout) => workout.id)).toEqual(['newer-active']);
  });

  it('restores the deleted cycle position and re-sorts restored workouts by newest date first', () => {
    const current = state();
    const cycle = current.cycles[1];
    const deletedWorkouts = current.workouts.filter((workout) => workout.cycleId === 'cycle-0');
    const deleted = deleteArchivedCycle(current, 'cycle-0');

    const restored = restoreArchivedCycle(deleted, cycle, 1, deletedWorkouts);

    expect(restored.cycles.map((item) => item.id)).toEqual(['cycle-1', 'cycle-0']);
    expect(restored.workouts.map((workout) => workout.id)).toEqual(['newer-active', 'newer-archived', 'older-archived']);
  });
});

describe('insertAt helper', () => {
  it('clamps out-of-range positions so undo can restore safely after list changes', () => {
    expect(insertAt(['b'], -10, 'a')).toEqual(['a', 'b']);
    expect(insertAt(['a'], 99, 'b')).toEqual(['a', 'b']);
  });
});
