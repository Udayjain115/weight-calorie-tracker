import { daysAgo } from '../utils/dates';
import { enrichSet, topPerformedSet, topValidPeakSet } from './strengthAnalysis.js';

function compareSets(current, baseline) {
  if (!current || !baseline) return null;
  const loadDelta = current.weight - baseline.weight;
  const repsDelta = current.reps - baseline.reps;
  const rirDelta = current.rir - baseline.rir;
  return { current, baseline, loadDelta, repsDelta, rirDelta };
}

function sortBestSet(a, b) {
  return b.weight - a.weight || b.reps - a.reps || a.rir - b.rir;
}

function topSetForWorkout(workout, exercise, state) {
  const topSet = topPerformedSet(workout.sets.filter((set) => set.exercise === exercise).map((set, setIndex) => enrichSet(set, workout, state, setIndex)));
  if (!topSet) return null;
  return {
    ...topSet,
    date: workout.date,
    workoutId: workout.id,
    splitId: workout.splitId,
    splitName: workout.splitName,
    cycleId: workout.cycleId,
    extenuating: workout.extenuating,
  };
}

function topSetsByExercise(workouts, exercise, state) {
  return workouts
    .map((workout) => topSetForWorkout(workout, exercise, state))
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function bestSet(sets) {
  return topValidPeakSet(sets) || [...sets].sort(sortBestSet)[0] || null;
}

function peakSet(sets) {
  return topValidPeakSet(sets);
}

function latestSet(sets) {
  return sets[sets.length - 1] || null;
}

function firstSet(sets) {
  return sets[0] || null;
}

function mostRecentArchivedCycle(cycles) {
  return [...cycles]
    .filter((cycle) => cycle.archived)
    .sort((a, b) => (b.endDate || b.startDate || '').localeCompare(a.endDate || a.startDate || ''))[0];
}

export function cycleExerciseBreakdown(state, exercises) {
  const activeCycleId = state.activeCycleId;
  const activeWorkouts = state.workouts.filter((workout) => workout.cycleId === activeCycleId);
  const previousCycle = mostRecentArchivedCycle(state.cycles);
  const previousCycleWorkouts = previousCycle ? state.workouts.filter((workout) => workout.cycleId === previousCycle.id) : [];

  return exercises
    .map((exercise) => {
      const cycleSets = topSetsByExercise(activeWorkouts, exercise, state);
      if (cycleSets.length === 0) return null;

      const current = latestSet(cycleSets);
      const recentWeekBest = bestSet(cycleSets.filter((set) => daysAgo(set.date) < 7));
      const priorWeekBest = bestSet(cycleSets.filter((set) => daysAgo(set.date) >= 7 && daysAgo(set.date) < 14));
      const start = firstSet(cycleSets.filter((set) => !set.repRange || set.reps >= set.repRange.min)) || firstSet(cycleSets);
      const currentPeak = peakSet(cycleSets);
      const previousPeak = peakSet(topSetsByExercise(previousCycleWorkouts, exercise, state));

      return {
        exercise,
        current,
        lastWeek: compareSets(recentWeekBest || current, priorWeekBest),
        start: compareSets(current, start),
        currentPeak: compareSets(current, currentPeak),
        previousPeak: compareSets(current, previousPeak),
        previousCycleName: previousCycle?.name || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.exercise.localeCompare(b.exercise));
}
