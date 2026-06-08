import { describe, expect, it } from 'vitest';
import { calorieGuidance, weightTrend } from './metrics.js';

describe('strength-only calorie mode', () => {
  it('decreases calories for 1+ lb weekly gain when strength is holding', () => {
    const guidance = calorieGuidance({ weeklyChange: 1.4 }, [], 0, 'strength_only');

    expect(guidance).toMatchObject({
      label: 'Pull back',
      tone: 'warning',
    });
    expect(guidance.detail).toContain('still allows intake decreases');
  });

  it('holds calories when strength is holding and weight gain is below the decrease threshold', () => {
    const guidance = calorieGuidance({ weeklyChange: 0.4 }, [], 0, 'strength_only');

    expect(guidance).toMatchObject({
      label: 'Hold steady',
      tone: 'success',
    });
  });

  it('increases calories when strength drops regardless of weight trend', () => {
    const guidance = calorieGuidance({ weeklyChange: 1.4 }, [{ exercise: 'Bench Press' }], 0, 'strength_only');

    expect(guidance).toMatchObject({
      label: 'Eat more',
      tone: 'danger',
    });
    expect(guidance.detail).toContain('ignores weight trend');
  });
});

describe('weight trend rolling window', () => {
  it('uses only the latest 14 days for the average and weekly change', () => {
    const trend = weightTrend(
      [
        { date: '2026-05-20', weight: 190 },
        { date: '2026-05-26', weight: 180 },
        { date: '2026-06-01', weight: 181 },
        { date: '2026-06-07', weight: 182 },
      ],
      '2026-06-08',
    );

    expect(trend.average).toBe(181);
    expect(trend.weeklyChange).toBeCloseTo(1.1667, 4);
    expect(trend.first).toMatchObject({ date: '2026-05-26', weight: 180 });
    expect(trend.last).toMatchObject({ date: '2026-06-07', weight: 182 });
  });
});
