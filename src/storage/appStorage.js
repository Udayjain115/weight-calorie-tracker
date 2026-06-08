import { commonExercises, createCycle, starterSplits, starterState } from '../data/defaults';
import { createMockState } from '../data/mockData';
import { normalizeExerciseEntry } from '../domain/exerciseConfig';
import { createId } from '../utils/id';

const STORAGE_KEY = 'strength-calories-v1';

export function normalizeState(value) {
  const next = { ...starterState, ...(value && typeof value === 'object' ? value : {}) };
  const requestedActiveCycleId = value && typeof value === 'object' ? value.activeCycleId : null;
  next.unit = next.unit === 'metric' ? 'metric' : 'imperial';
  next.trackingMode = next.trackingMode === 'lifts' ? 'lifts' : 'full';
  next.onboardingComplete = Boolean(next.onboardingComplete);
  next.goalMode = ['maingain', 'small_deficit', 'strength_only'].includes(next.goalMode) ? next.goalMode : 'maingain';
  next.calories = Number.isFinite(Number(next.calories)) ? Number(next.calories) : starterState.calories;
  next.cycles = normalizeCycles(next.cycles);
  next.activeCycleId = next.cycles.some((cycle) => cycle.id === requestedActiveCycleId)
    ? requestedActiveCycleId
    : next.cycles.find((cycle) => !cycle.archived)?.id || next.cycles[0].id;
  next.splits = normalizeSplits(next.splits);
  next.customExercises = ensureArray(next.customExercises);
  next.bodyWeights = ensureArray(next.bodyWeights);
  next.workouts = ensureArray(next.workouts).map((workout) => ({ ...workout, cycleId: workout.cycleId || next.activeCycleId }));
  next.hasMockData = Boolean(next.hasMockData);
  next.mockDataCleared = Boolean(next.mockDataCleared);
  return next;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCycles(cycles) {
  const source = Array.isArray(cycles) && cycles.length > 0 ? cycles : [createCycle()];

  return source.map(normalizeCycle);
}

function normalizeCycle(cycle, index) {
  return {
    id: cycle?.id || createId(),
    name: cycle?.name || `Cycle ${index + 1}`,
    startDate: cycle?.startDate || '',
    endDate: cycle?.endDate || '',
    archived: Boolean(cycle?.archived),
    mock: Boolean(cycle?.mock),
    splitsSnapshot: Array.isArray(cycle?.splitsSnapshot) ? cycle.splitsSnapshot : [],
  };
}

function normalizeSplits(splits) {
  const source = Array.isArray(splits) && splits.length > 0 ? splits : starterSplits;

  return source.map(normalizeSplit).filter(isValidSplit);
}

function normalizeSplit(split) {
  const exercises = Array.isArray(split?.exercises) && split.exercises.length > 0 ? split.exercises : [commonExercises[0]];
  return {
    id: split?.id || createId(),
    name: split?.name || 'Custom',
    exercises: exercises.map(normalizeSplitExercise),
  };
}

function normalizeSplitExercise(exercise) {
  const normalized = normalizeExerciseEntry(exercise);
  if (!normalized.repRange) return normalized.name;
  return { name: normalized.name, repMin: normalized.repRange.min, repMax: normalized.repRange.max };
}

function isValidSplit(split) {
  return split.name && split.exercises.length > 0;
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    const shouldSeedMockData =
      !parsed ||
      (!parsed.mockDataCleared &&
        !parsed.hasMockData &&
        (!Array.isArray(parsed.bodyWeights) || parsed.bodyWeights.length === 0) &&
        (!Array.isArray(parsed.workouts) || parsed.workouts.length === 0));
    return normalizeState(shouldSeedMockData ? createMockState() : parsed);
  } catch {
    return normalizeState(createMockState());
  }
}

export function saveState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

export function createFreshUserState() {
  return normalizeState({
    bodyWeights: [],
    workouts: [],
    hasMockData: false,
    mockDataCleared: true,
    onboardingComplete: false,
  });
}
