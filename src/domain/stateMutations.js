import { exerciseName } from './exerciseConfig.js';

export function insertAt(items, index, item) {
  const next = [...items];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, item);
  return next;
}

export function removeSplitExercise(state, splitId, exerciseNameValue) {
  return {
    ...state,
    splits: state.splits.map((split) =>
      split.id === splitId ? { ...split, exercises: split.exercises.filter((exercise) => exerciseName(exercise) !== exerciseNameValue) } : split,
    ),
  };
}

export function restoreSplitExercise(state, splitId, exerciseNameValue, exerciseIndex, exercise) {
  return {
    ...state,
    splits: state.splits.map((split) =>
      split.id === splitId
        ? { ...split, exercises: insertAt(split.exercises.filter((item) => exerciseName(item) !== exerciseNameValue), exerciseIndex, exercise) }
        : split,
    ),
  };
}

export function deleteSplit(state, splitId) {
  return {
    ...state,
    splits: state.splits.filter((split) => split.id !== splitId),
  };
}

export function restoreSplit(state, split, splitIndex) {
  return {
    ...state,
    splits: insertAt(state.splits.filter((item) => item.id !== split.id), splitIndex, split),
  };
}

export function deleteArchivedCycle(state, cycleId) {
  return {
    ...state,
    cycles: state.cycles.filter((cycle) => cycle.id !== cycleId),
    workouts: state.workouts.filter((workout) => workout.cycleId !== cycleId),
  };
}

export function restoreArchivedCycle(state, cycle, cycleIndex, workouts) {
  return {
    ...state,
    cycles: insertAt(state.cycles.filter((item) => item.id !== cycle.id), cycleIndex, cycle),
    workouts: [...workouts, ...state.workouts].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
