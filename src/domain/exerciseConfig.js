export function exerciseName(exercise) {
  return typeof exercise === 'string' ? exercise : exercise?.name || '';
}

export function normalizeExerciseEntry(exercise) {
  if (typeof exercise === 'string') return { name: exercise, repRange: null };

  const name = exerciseName(exercise);
  const repMin = Number(exercise?.repMin ?? exercise?.repRange?.min);
  const repMax = Number(exercise?.repMax ?? exercise?.repRange?.max);
  const hasRange = Number.isFinite(repMin) && Number.isFinite(repMax) && repMin > 0 && repMax >= repMin;

  return {
    name,
    repRange: hasRange ? { min: repMin, max: repMax } : null,
  };
}

export function displayExercise(exercise) {
  const normalized = normalizeExerciseEntry(exercise);
  if (!normalized.repRange) return normalized.name;
  return `${normalized.name} (${normalized.repRange.min}-${normalized.repRange.max})`;
}

export function getRepRangeForExercise(state, exerciseNameValue) {
  const allSplitExercises = [
    ...(state?.splits || []).flatMap((split) => split.exercises || []),
    ...(state?.cycles || []).flatMap((cycle) => (cycle.splitsSnapshot || []).flatMap((split) => split.exercises || [])),
  ];

  return allSplitExercises.map(normalizeExerciseEntry).find((exercise) => exercise.name === exerciseNameValue && exercise.repRange)?.repRange || null;
}

export function setMeetsRepRange(set, repRange) {
  if (!repRange) return true;
  return Number(set.reps) >= repRange.min;
}

export function makeSplitExercise(name, repMin, repMax) {
  const min = Number(repMin);
  const max = Number(repMax);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) return name;
  return { name, repMin: min, repMax: max };
}
