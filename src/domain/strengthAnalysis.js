import { getRepRangeForExercise, setMeetsRepRange } from './exerciseConfig.js';
import { rollingItems } from '../utils/dates.js';

export function topPerformedSet(sets) {
  return comparableSets(sets).sort(sortBestSet)[0] || null;
}

export function topValidPeakSet(sets) {
  return comparableSets(sets).filter((set) => setMeetsRepRange(set, set.repRange)).sort(sortBestSet)[0] || null;
}

function compareStrength(current, baseline) {
  if (!current || !baseline) return { status: 'no_baseline', reason: 'No valid baseline' };

  if (current.weight > baseline.weight) {
    return { status: 'gain', reason: 'Load increased' };
  }

  if (current.weight < baseline.weight) {
    return { status: 'loss', reason: 'Load dropped below valid peak' };
  }

  if (current.reps < baseline.reps && current.rir <= baseline.rir) {
    return { status: 'loss', reason: 'Fewer reps at the same load and same or harder RIR' };
  }

  if (current.reps > baseline.reps || (current.reps === baseline.reps && current.rir > baseline.rir)) {
    return { status: 'gain', reason: 'More reps or more reps in reserve at the same load' };
  }

  return { status: 'neutral', reason: 'Matched valid baseline' };
}

export function summarizeStrength(workouts, state = null) {
  const current = rollingItems(workouts, 0, 14).filter((workout) => !workout.extenuating);
  const previous = rollingItems(workouts, 14, 28).filter((workout) => !workout.extenuating);
  const currentByExercise = groupSetsByExercise(current, state);
  const previousByExercise = groupSetsByExercise(previous, state);

  return Object.keys(currentByExercise)
    .map((exercise) => {
      const currentBest = topValidPeakSet(currentByExercise[exercise]) || topPerformedSet(currentByExercise[exercise]);
      const previousBest = topValidPeakSet(previousByExercise[exercise] || []);
      const comparison = compareStrength(currentBest, previousBest);
      if (comparison.status !== 'loss') return null;

      return {
        exercise,
        previousBest,
        currentBest,
        repsLost: previousBest.weight === currentBest.weight ? previousBest.reps - currentBest.reps : 0,
        loadLost: Math.max(0, previousBest.weight - currentBest.weight),
        reason: comparison.reason,
        belowRepRange: Boolean(currentBest.repRange && !setMeetsRepRange(currentBest, currentBest.repRange)),
      };
    })
    .filter(Boolean);
}

export function analyzeWorkoutStrength(workout, workouts, state = null) {
  const priorWorkouts = workouts.filter((item) => item.id !== workout.id && item.date < workout.date && !item.extenuating);
  const setFlags = workout.sets.map((set, setIndex) => {
    const current = enrichSet(set, workout, state, setIndex);
    const baseline = topValidPeakSet(groupSetsByExercise(priorWorkouts, state)[current.exercise] || []);
    const comparison = compareStrength(current, baseline);
    return {
      exercise: current.exercise,
      setIndex,
      current,
      baseline,
      status: comparison.status,
      reason: comparison.reason,
      belowRepRange: Boolean(current.repRange && !setMeetsRepRange(current, current.repRange)),
    };
  });

  const exerciseFlags = Object.values(
    setFlags.reduce((groups, flag) => {
      groups[flag.exercise] ||= [];
      groups[flag.exercise].push(flag);
      return groups;
    }, {}),
  ).map((flags) => {
    const topSet = topPerformedSet(flags.map((flag) => flag.current));
    const selected = flags.find((flag) => flag.current === topSet) || flags[0];
    return {
      exercise: selected.exercise,
      status: selected.status,
      reason: selected.reason,
      current: selected.current,
      baseline: selected.baseline,
      belowRepRange: selected.belowRepRange,
    };
  });

  const comparedExercises = exerciseFlags.filter((flag) => flag.status !== 'no_baseline');
  const losingExercises = comparedExercises.filter((flag) => flag.status === 'loss');

  return {
    setFlags,
    exerciseFlags,
    comparedExerciseCount: comparedExercises.length,
    losingExerciseCount: losingExercises.length,
    workoutFlag: comparedExercises.length > 0 && losingExercises.length > comparedExercises.length / 2,
  };
}

function groupSetsByExercise(workouts, state = null) {
  return workouts.reduce((groups, workout) => {
    workout.sets.forEach((set, setIndex) => {
      const enriched = enrichSet(set, workout, state, setIndex);
      groups[enriched.exercise] ||= [];
      groups[enriched.exercise].push(enriched);
    });
    return groups;
  }, {});
}

export function enrichSet(set, workout = {}, state = null, setIndex = 0) {
  const repRange = set.repRange || getRepRangeForExercise(state, set.exercise);
  return {
    ...set,
    weight: Number(set.weight),
    reps: Number(set.reps),
    rir: Number(set.rir),
    date: workout.date || set.date,
    workoutId: workout.id || set.workoutId,
    splitId: workout.splitId || set.splitId,
    splitName: workout.splitName || set.splitName,
    cycleId: workout.cycleId || set.cycleId,
    extenuating: workout.extenuating || set.extenuating,
    setIndex,
    repRange,
  };
}

function comparableSets(sets) {
  return sets.filter((set) => Number.isFinite(set.weight) && Number.isFinite(set.reps) && Number.isFinite(set.rir));
}

function sortBestSet(a, b) {
  return b.weight - a.weight || b.reps - a.reps || a.rir - b.rir;
}
