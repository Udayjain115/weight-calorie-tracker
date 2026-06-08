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
      detail: 'Two weigh-ins inside the latest 14 days are needed for calorie guidance.',
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
      label: 'Decrease calories',
      detail: 'Body weight is climbing at 1+ lb per week. Pull calories down before fat gain gets ahead of you.',
      tone: 'warning',
    };
  }

  if (Math.abs(change) < 0.25 && gymDown) {
    return {
      label: 'Increase calories',
      detail: 'Weight is flat and comparable gym performance is down. A small calorie increase is warranted.',
      tone: 'danger',
    };
  }

  if (Math.abs(change) >= 0.25 && Math.abs(change) <= 0.5) {
    return {
      label: 'No change',
      detail: 'Weekly weight change is inside the acceptable 0.25-0.5 lb drift range.',
      tone: 'success',
    };
  }

  if (extenuatingCount > 0 && !gymDown) {
    return {
      label: 'No change',
      detail: 'Recent poor sessions were marked as extenuating, so they are not driving calorie changes.',
      tone: 'success',
    };
  }

  return {
    label: 'No change',
    detail: 'Weight and gym performance are within the maintenance target for now.',
    tone: 'success',
  };
}

function smallDeficitGuidance(change, gymDown, extenuatingCount) {
  if (change < -1) {
    return {
      label: 'Increase calories',
      detail: 'Weight is dropping faster than the small-deficit target. Add calories to protect training performance.',
      tone: 'warning',
    };
  }

  if (gymDown) {
    return {
      label: 'Increase calories',
      detail: 'Performance is down during the deficit. Add calories unless the drop is clearly explained by extenuating factors.',
      tone: 'danger',
    };
  }

  if (change >= 0.25) {
    return {
      label: 'Decrease calories',
      detail: 'Weight is increasing, which does not match the small-deficit goal. Reduce calories slightly.',
      tone: 'warning',
    };
  }

  if (change > -0.25 && change < 0.25) {
    return {
      label: 'Decrease calories slightly',
      detail: 'Weight is roughly flat. Training is holding, so a small calorie decrease can move you into a mild deficit.',
      tone: 'neutral',
    };
  }

  if (change >= -1 && change <= -0.25) {
    return {
      label: 'No change',
      detail: 'Weight is falling slowly and gym performance is not showing a comparable decline.',
      tone: 'success',
    };
  }

  if (extenuatingCount > 0) {
    return {
      label: 'No change',
      detail: 'Recent poor sessions were marked as extenuating, so they are not driving calorie changes.',
      tone: 'success',
    };
  }

  return {
    label: 'No change',
    detail: 'Small-deficit trend is acceptable for now.',
    tone: 'success',
  };
}

function strengthOnlyGuidance(change, gymDown, extenuatingCount) {
  if (gymDown) {
    return {
      label: 'Increase calories',
      detail: 'Strength is down. This mode ignores weight trend and only raises calories when comparable gym performance drops.',
      tone: 'danger',
    };
  }

  if (change >= 1) {
    return {
      label: 'Decrease calories',
      detail: 'Strength is holding, but body weight is climbing at 1+ lb per week. This mode still allows calorie decreases to control unnecessary gain.',
      tone: 'warning',
    };
  }

  if (extenuatingCount > 0) {
    return {
      label: 'No change',
      detail: 'No confirmed strength drop. Flagged sessions are noted, but this mode only changes calories when strength is actually down.',
      tone: 'success',
    };
  }

  return {
    label: 'No change',
    detail: 'Strength is holding and weight gain is below the decrease threshold, so calories stay the same.',
    tone: 'success',
  };
}
