import { describe, expect, it } from 'vitest';
import { calorieAverage, calorieGuidance, calorieTargetForToday, weightTrend } from './metrics.js';

describe('two-mode calorie guidance', () => {
  it('decreases calories for 1+ lb weekly gain in maingain mode', () => {
    const guidance = calorieGuidance({ weeklyChange: 1.4 }, [], 0, 'maingain');

    expect(guidance).toMatchObject({
      label: 'Pull back',
      tone: 'warning',
    });
    expect(guidance.detail).toContain('1+ lb per week');
  });

  it('decreases calories for 1+ lb weekly gain in small-deficit mode', () => {
    const guidance = calorieGuidance({ weeklyChange: 1.4 }, [], 0, 'small_deficit');

    expect(guidance).toMatchObject({
      label: 'Pull back',
      tone: 'warning',
    });
  });

  it('falls back to maingain if an old strength-only state reaches guidance directly', () => {
    const guidance = calorieGuidance({ weeklyChange: -0.4, lostTwoWeeksInRow: true }, [], 0, 'strength_only');

    expect(guidance).toMatchObject({
      label: 'Eat more',
      tone: 'warning',
    });
  });
});

describe('strength-down calorie guidance', () => {
  it('increases calories in maingain mode when weight is not gaining too quickly', () => {
    const guidance = calorieGuidance({ weeklyChange: 0.4 }, [{ exercise: 'Bench Press' }], 0, 'maingain');

    expect(guidance).toMatchObject({
      label: 'Eat more',
      tone: 'danger',
    });
    expect(guidance.detail).toContain('Comparable strength is down');
  });

  it('increases calories in small-deficit mode when strength is down below the 1 lb gain guardrail', () => {
    const guidance = calorieGuidance({ weeklyChange: 0.5 }, [{ exercise: 'Squat' }], 0, 'small_deficit');

    expect(guidance).toMatchObject({
      label: 'Eat more',
      tone: 'danger',
    });
  });

  it('decreases calories for 1+ lb gain even when strength is down', () => {
    const guidance = calorieGuidance({ weeklyChange: 1.2 }, [{ exercise: 'Bench Press' }], 0, 'maingain');

    expect(guidance).toMatchObject({
      label: 'Pull back',
      tone: 'warning',
    });
  });
});

describe('business calorie guidance rules', () => {
  it('holds when weight is flat and performance is steady or improved', () => {
    const guidance = calorieGuidance({ weeklyChange: 0.1 }, [], 0, 'maingain');

    expect(guidance).toMatchObject({
      label: 'Hold steady',
      tone: 'success',
    });
    expect(guidance.detail).toContain('effectively flat');
  });

  it('holds for 0.25-0.5 lb movement when performance is steady or improved', () => {
    expect(calorieGuidance({ weeklyChange: 0.35 }, [], 0, 'maingain')).toMatchObject({ label: 'Hold steady' });
    expect(calorieGuidance({ weeklyChange: -0.35 }, [], 0, 'small_deficit')).toMatchObject({ label: 'Hold steady' });
  });

  it('increases calories in maingain mode after losing weight two weeks in a row', () => {
    const guidance = calorieGuidance({ weeklyChange: -0.4, lostTwoWeeksInRow: true }, [], 0, 'maingain');

    expect(guidance).toMatchObject({
      label: 'Eat more',
      tone: 'warning',
    });
    expect(guidance.detail).toContain('two weeks in a row');
  });

  it('holds in small-deficit mode after losing two weeks in a row when strength is not down', () => {
    const guidance = calorieGuidance({ weeklyChange: -0.4, lostTwoWeeksInRow: true }, [], 0, 'small_deficit');

    expect(guidance).toMatchObject({
      label: 'Hold steady',
      tone: 'success',
    });
    expect(guidance.detail).toContain('fits small-deficit mode');
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

  it('detects when weekly average weight has fallen two weeks in a row', () => {
    const trend = weightTrend(
      [
        { date: '2026-05-21', weight: 184 },
        { date: '2026-05-28', weight: 182 },
        { date: '2026-06-04', weight: 180 },
        { date: '2026-06-08', weight: 179.5 },
      ],
      '2026-06-08',
    );

    expect(trend.lostTwoWeeksInRow).toBe(true);
  });
});

describe('calorie average', () => {
  it('averages logged intake inside the latest 7-day window', () => {
    const average = calorieAverage(
      [
        { date: '2026-05-30', calories: 1000 },
        { date: '2026-06-02', calories: 2500 },
        { date: '2026-06-05', calories: 2700 },
        { date: '2026-06-08', calories: 2900 },
      ],
      7,
      '2026-06-08',
    );

    expect(average).toMatchObject({ days: 3, latest: { date: '2026-06-08', calories: 2900 } });
    expect(average.average).toBeCloseTo(2700, 4);
  });

  it('caps today calories instead of aggressively forcing the 7-day target average', () => {
    const target = calorieTargetForToday(
      [
        { date: '2026-06-02', calories: 2000 },
        { date: '2026-06-03', calories: 2000 },
        { date: '2026-06-04', calories: 2000 },
        { date: '2026-06-05', calories: 2000 },
        { date: '2026-06-06', calories: 2000 },
        { date: '2026-06-07', calories: 2000 },
      ],
      2700,
      '2026-06-08',
    );

    expect(target).toMatchObject({
      previousDays: 6,
      recommendedCalories: 2970,
      exactCatchUpCalories: 6900,
      cappedAdjustment: 270,
      isCapped: true,
      isCompleteWindow: true,
    });
    expect(target.projectedAverage).toBeCloseTo(2138.5714, 4);
  });

  it('caps downward corrections instead of recommending near-zero calories', () => {
    const target = calorieTargetForToday(
      [
        { date: '2026-06-02', calories: 4000 },
        { date: '2026-06-03', calories: 4000 },
        { date: '2026-06-04', calories: 4000 },
        { date: '2026-06-05', calories: 4000 },
        { date: '2026-06-06', calories: 4000 },
        { date: '2026-06-07', calories: 4000 },
      ],
      2700,
      '2026-06-08',
    );

    expect(target.recommendedCalories).toBe(2430);
    expect(target.rawRecommendation).toBeLessThan(0);
    expect(target.isCapped).toBe(true);
  });

  it('does not recommend 2700 after a 2000-calorie week when the new target is 2100', () => {
    const target = calorieTargetForToday(
      [
        { date: '2026-06-02', calories: 2000 },
        { date: '2026-06-03', calories: 2000 },
        { date: '2026-06-04', calories: 2000 },
        { date: '2026-06-05', calories: 2000 },
        { date: '2026-06-06', calories: 2000 },
        { date: '2026-06-07', calories: 2000 },
      ],
      2100,
      '2026-06-08',
    );

    expect(target.exactCatchUpCalories).toBe(2700);
    expect(target.recommendedCalories).toBe(2310);
    expect(target.cappedAdjustment).toBe(210);
    expect(target.isCapped).toBe(true);
  });
});
