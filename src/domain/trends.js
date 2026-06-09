function movingAverage(items, valueKey, windowSize = 3) {
  return items.map((item, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = items.slice(start, index + 1);
    const average = window.reduce((sum, point) => sum + point[valueKey], 0) / window.length;
    return { ...item, average };
  });
}

export function bodyWeightChartPoints(bodyWeights) {
  const sorted = [...bodyWeights]
    .filter((entry) => entry.date && Number.isFinite(entry.weight))
    .sort((a, b) => a.date.localeCompare(b.date));

  return movingAverage(
    sorted.map((entry) => ({
      id: entry.id,
      date: entry.date,
      raw: entry.weight,
    })),
    'raw',
  );
}

export function calorieChartPoints(calorieEntries) {
  const sorted = [...calorieEntries]
    .filter((entry) => entry.date && Number.isFinite(Number(entry.calories)) && Number(entry.calories) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return movingAverage(
    sorted.map((entry) => ({
      id: entry.id,
      date: entry.date,
      raw: Number(entry.calories),
    })),
    'raw',
    7,
  );
}

function scopedWorkouts(workouts, scope = {}) {
  if (scope.mode !== 'split' || !scope.splitId) return workouts;
  return workouts.filter((workout) => workout.splitId === scope.splitId);
}

export function exerciseChartPoints(workouts, exercise, scope) {
  const points = scopedWorkouts(workouts, scope)
    .map((workout) => {
      const topSet = workout.sets
        .filter((set) => set.exercise === exercise)
        .sort((a, b) => b.weight - a.weight || b.reps - a.reps || a.rir - b.rir)[0];
      if (!topSet) return null;
      return {
        id: workout.id,
        date: workout.date,
        raw: topSet.weight,
        weight: topSet.weight,
        reps: topSet.reps,
        rir: topSet.rir,
        splitId: workout.splitId,
        splitName: workout.splitName,
        extenuating: workout.extenuating,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  return movingAverage(points, 'raw');
}

export function exerciseProgressionRows(workouts, exercise, scope) {
  const points = exerciseChartPoints(workouts, exercise, scope);

  return points.map((point, index) => {
    const previous = points[index - 1];
    if (!previous) {
      return {
        ...point,
        loadDelta: null,
        repsDelta: null,
        rirDelta: null,
        status: 'Baseline',
        tone: 'neutral',
      };
    }

    const loadDelta = point.weight - previous.weight;
    const repsDelta = point.reps - previous.reps;
    const rirDelta = point.rir - previous.rir;
    const { status, tone } = describeProgression(point, previous, { loadDelta, repsDelta, rirDelta });

    return {
      ...point,
      loadDelta,
      repsDelta,
      rirDelta,
      status,
      tone,
    };
  });
}

function describeProgression(point, previous, { loadDelta, repsDelta, rirDelta }) {
  const sameLoad = Math.abs(loadDelta) < 0.01;
  const sameReps = repsDelta === 0;

  return [
    { when: loadDelta > 0, status: 'Load up', tone: 'good' },
    { when: sameLoad && repsDelta > 0, status: 'Reps up', tone: 'good' },
    { when: sameLoad && sameReps && rirDelta > 0, status: 'Easier', tone: 'good' },
    { when: sameLoad && repsDelta < 0 && point.rir <= previous.rir, status: 'Possible drop', tone: 'bad' },
    { when: loadDelta < 0, status: 'Load down', tone: 'bad' },
  ].find((rule) => rule.when) || { status: 'Mixed', tone: 'neutral' };
}
