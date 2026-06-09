import { daysAgo, daysBetween, rollingItems, today } from '../utils/dates';
import { exerciseName } from './exerciseConfig.js';
export { summarizeStrength } from './strengthAnalysis.js';

export function getExerciseNames(commonExercises, state) {
  return Array.from(new Set([...commonExercises, ...state.customExercises, ...state.splits.flatMap((split) => split.exercises.map(exerciseName))])).sort();
}

export function weightTrend(bodyWeights, referenceDate) {
  const current = rollingItems(bodyWeights, 0, 14, referenceDate).sort((a, b) => a.date.localeCompare(b.date));
  if (current.length < 2) return null;

  const first = current[0];
  const last = current[current.length - 1];
  const days = Math.max(1, daysBetween(first.date, last.date));
  const weeklyChange = ((last.weight - first.weight) / days) * 7;

  return {
    first,
    last,
    weeklyChange,
    average: current.reduce((sum, item) => sum + item.weight, 0) / current.length,
    lostTwoWeeksInRow: lostTwoWeeksInRow(bodyWeights, referenceDate),
  };
}

export function calorieAverage(calorieEntries, days = 7, referenceDate) {
  const current = rollingItems(calorieEntries, 0, days, referenceDate)
    .filter((entry) => Number(entry.calories) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (current.length === 0) return null;

  return {
    days: current.length,
    average: current.reduce((sum, entry) => sum + Number(entry.calories), 0) / current.length,
    latest: current[current.length - 1],
  };
}

export function calorieTargetForToday(calorieEntries, dailyTarget, referenceDate = today) {
  const target = Number(dailyTarget);
  if (!Number.isFinite(target) || target <= 0) return null;

  const previousSix = calorieEntries
    .filter((entry) => {
      const age = daysAgo(entry.date, referenceDate);
      return age >= 1 && age <= 6 && Number(entry.calories) > 0;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const todayEntry = calorieEntries.find((entry) => entry.date === referenceDate && Number(entry.calories) > 0);
  const previousCalories = previousSix.reduce((sum, entry) => sum + Number(entry.calories), 0);
  const rawRecommendation = target * 7 - previousCalories;
  const maxAdjustment = Math.min(300, target * 0.1);
  const cappedAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, rawRecommendation - target));
  const recommendedCalories = Math.max(0, Math.round(target + cappedAdjustment));
  const projectedAverage = (previousCalories + (todayEntry ? Number(todayEntry.calories) : recommendedCalories)) / (previousSix.length + 1);

  return {
    target,
    previousDays: previousSix.length,
    previousAverage: previousSix.length ? previousCalories / previousSix.length : null,
    recommendedCalories,
    rawRecommendation,
    exactCatchUpCalories: Math.max(0, Math.round(rawRecommendation)),
    cappedAdjustment: Math.round(cappedAdjustment),
    isCapped: Math.round(rawRecommendation) !== recommendedCalories,
    todayLogged: todayEntry ? Number(todayEntry.calories) : null,
    projectedAverage,
    isCompleteWindow: previousSix.length === 6,
  };
}

export function calorieGuidance(trend, strengthAlerts, extenuatingCount, goalMode = 'maingain') {
  const mode = ['maingain', 'small_deficit'].includes(goalMode) ? goalMode : 'maingain';

  if (!trend) {
    return {
      label: 'Log more weigh-ins',
      detail: 'Two weigh-ins inside the latest 14 days are needed before the app can make a recommendation.',
      tone: 'neutral',
    };
  }

  const change = trend.weeklyChange;
  const gymDown = strengthAlerts.length > 0;

  if (change >= 1) {
    return pullBackGuidance();
  }

  if (gymDown) {
    return strengthDownGuidance();
  }

  if (mode === 'maingain' && trend.lostTwoWeeksInRow) {
    return {
      label: 'Eat more',
      detail: 'Body weight has moved down two weeks in a row. In maingain mode, increase intake unless performance is clearly improving and this loss is intentional.',
      tone: 'warning',
    };
  }

  if (extenuatingCount > 0) {
    return {
      label: 'Hold steady',
      detail: 'Recent poor sessions were marked as extenuating, so they are not driving intake changes.',
      tone: 'success',
    };
  }

  if (mode === 'small_deficit' && trend.lostTwoWeeksInRow) {
    return {
      label: 'Hold steady',
      detail: 'Weight is down two weeks in a row, which fits small-deficit mode because comparable strength is not down.',
      tone: 'success',
    };
  }

  return holdSteadyGuidance(change);
}

function strengthDownGuidance() {
  return {
    label: 'Eat more',
    detail: 'Comparable strength is down, so intake should increase even if body-weight trend is otherwise acceptable.',
    tone: 'danger',
  };
}

function pullBackGuidance() {
  return {
    label: 'Pull back',
    detail: 'Body weight is climbing at 1+ lb per week. Decrease calories before fat gain gets ahead of you.',
    tone: 'warning',
  };
}

function holdSteadyGuidance(change) {
  if (Math.abs(change) < 0.25) {
    return {
      label: 'Hold steady',
      detail: 'Body weight is effectively flat and comparable performance is steady or improving, so calories stay the same.',
      tone: 'success',
    };
  }

  if (Math.abs(change) >= 0.25 && Math.abs(change) <= 0.5) {
    return {
      label: 'Hold steady',
      detail: 'Weekly weight change is inside the acceptable 0.25-0.5 lb drift range and performance is steady or improving.',
      tone: 'success',
    };
  }

  return {
    label: 'Hold steady',
    detail: 'No calorie change is needed because performance is not down and weight gain is below the 1 lb/week decrease threshold.',
    tone: 'success',
  };
}

function lostTwoWeeksInRow(bodyWeights, referenceDate) {
  const buckets = [
    rollingItems(bodyWeights, 14, 21, referenceDate),
    rollingItems(bodyWeights, 7, 14, referenceDate),
    rollingItems(bodyWeights, 0, 7, referenceDate),
  ].map(averageWeight);

  if (buckets.some((bucket) => bucket === null)) return false;
  return buckets[0] > buckets[1] && buckets[1] > buckets[2];
}

function averageWeight(entries) {
  const valid = entries.filter((entry) => Number.isFinite(Number(entry.weight)));
  if (valid.length === 0) return null;
  return valid.reduce((sum, entry) => sum + Number(entry.weight), 0) / valid.length;
}
