import { daysBetween, rollingItems } from '../utils/dates';
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
  };
}

export function calorieGuidance(trend, strengthAlerts, extenuatingCount, goalMode = 'maingain') {
  if (!trend) {
    return {
      label: 'Log more weigh-ins',
      detail: 'Two weigh-ins inside the latest 14 days are needed before the app can make a recommendation.',
      tone: 'neutral',
    };
  }

  const change = trend.weeklyChange;
  const gymDown = strengthAlerts.length > 0;

  if (goalMode === 'strength_only') {
    return strengthOnlyGuidance(change, gymDown, extenuatingCount);
  }

  if (goalMode === 'small_deficit') {
    return smallDeficitGuidance(change, gymDown, extenuatingCount);
  }

  return maingainGuidance(change, gymDown, extenuatingCount);
}

function maingainGuidance(change, gymDown, extenuatingCount) {
  if (change >= 1) {
    return {
      label: 'Pull back',
      detail: 'Body weight is climbing at 1+ lb per week. Bring intake down before fat gain gets ahead of you.',
      tone: 'warning',
    };
  }

  if (Math.abs(change) < 0.25 && gymDown) {
    return {
      label: 'Eat more',
      detail: 'Weight is flat and comparable gym performance is down. A small intake increase is warranted.',
      tone: 'danger',
    };
  }

  if (Math.abs(change) >= 0.25 && Math.abs(change) <= 0.5) {
    return {
      label: 'Hold steady',
      detail: 'Weekly weight change is inside the acceptable 0.25-0.5 lb drift range.',
      tone: 'success',
    };
  }

  if (extenuatingCount > 0 && !gymDown) {
    return {
      label: 'Hold steady',
      detail: 'Recent poor sessions were marked as extenuating, so they are not driving intake changes.',
      tone: 'success',
    };
  }

  return {
    label: 'Hold steady',
    detail: 'Weight and gym performance are within the maintenance target for now.',
    tone: 'success',
  };
}

function smallDeficitGuidance(change, gymDown, extenuatingCount) {
  if (change < -1) {
    return {
      label: 'Eat more',
      detail: 'Weight is dropping faster than the small-deficit target. Add food to protect training performance.',
      tone: 'warning',
    };
  }

  if (gymDown) {
    return {
      label: 'Eat more',
      detail: 'Performance is down during the deficit. Increase intake unless the drop is clearly explained by extenuating factors.',
      tone: 'danger',
    };
  }

  if (change >= 0.25) {
    return {
      label: 'Pull back',
      detail: 'Weight is increasing, which does not match the small-deficit goal. Reduce intake slightly.',
      tone: 'warning',
    };
  }

  if (change > -0.25 && change < 0.25) {
    return {
      label: 'Nudge down',
      detail: 'Weight is roughly flat. Training is holding, so a small intake decrease can move you into a mild deficit.',
      tone: 'neutral',
    };
  }

  if (change >= -1 && change <= -0.25) {
    return {
      label: 'Hold steady',
      detail: 'Weight is falling slowly and gym performance is not showing a comparable decline.',
      tone: 'success',
    };
  }

  if (extenuatingCount > 0) {
    return {
      label: 'Hold steady',
      detail: 'Recent poor sessions were marked as extenuating, so they are not driving intake changes.',
      tone: 'success',
    };
  }

  return {
    label: 'Hold steady',
    detail: 'Small-deficit trend is acceptable for now.',
    tone: 'success',
  };
}

function strengthOnlyGuidance(change, gymDown, extenuatingCount) {
  if (gymDown) {
    return {
      label: 'Eat more',
      detail: 'Strength is down. This mode ignores weight trend and only raises intake when comparable gym performance drops.',
      tone: 'danger',
    };
  }

  if (change >= 1) {
    return {
      label: 'Pull back',
      detail: 'Strength is holding, but body weight is climbing at 1+ lb per week. This mode still allows intake decreases to control unnecessary gain.',
      tone: 'warning',
    };
  }

  if (extenuatingCount > 0) {
    return {
      label: 'Hold steady',
      detail: 'No confirmed strength drop. Flagged sessions are noted, but this mode only changes intake when strength is actually down.',
      tone: 'success',
    };
  }

  return {
    label: 'Hold steady',
    detail: 'Strength is holding and weight gain is below the decrease threshold, so intake stays the same.',
    tone: 'success',
  };
}
