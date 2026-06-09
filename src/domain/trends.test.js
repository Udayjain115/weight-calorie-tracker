import { describe, expect, it } from 'vitest';
import { bodyWeightChartPoints, calorieChartPoints, exerciseChartPoints, exerciseProgressionRows } from './trends.js';

describe('chart moving averages', () => {
  it('uses a trailing 3-point moving average for body weight chart points', () => {
    const points = bodyWeightChartPoints([
      { id: 'd', date: '2026-06-04', weight: 184 },
      { id: 'b', date: '2026-06-02', weight: 182 },
      { id: 'a', date: '2026-06-01', weight: 180 },
      { id: 'c', date: '2026-06-03', weight: 181 },
    ]);

    expect(points.map((point) => [point.date, point.raw, point.average])).toEqual([
      ['2026-06-01', 180, 180],
      ['2026-06-02', 182, 181],
      ['2026-06-03', 181, 181],
      ['2026-06-04', 184, 182.33333333333334],
    ]);
  });

  it('uses a trailing 7-point moving average for calorie chart points', () => {
    const points = calorieChartPoints([
      { id: 'd', date: '2026-06-04', calories: 2800 },
      { id: 'b', date: '2026-06-02', calories: 2200 },
      { id: 'a', date: '2026-06-01', calories: 2000 },
      { id: 'c', date: '2026-06-03', calories: 2400 },
    ]);

    expect(points.map((point) => [point.date, point.raw, point.average])).toEqual([
      ['2026-06-01', 2000, 2000],
      ['2026-06-02', 2200, 2100],
      ['2026-06-03', 2400, 2200],
      ['2026-06-04', 2800, 2350],
    ]);
  });
});

describe('exercise chart and progression data', () => {
  const workouts = [
    {
      id: 'upper-1',
      date: '2026-06-01',
      splitId: 'upper-a',
      splitName: 'Upper A',
      extenuating: false,
      sets: [
        { exercise: 'Bench Press', weight: 100, reps: 8, rir: 2 },
        { exercise: 'Bench Press', weight: 105, reps: 5, rir: 1 },
      ],
    },
    {
      id: 'upper-2',
      date: '2026-06-08',
      splitId: 'upper-a',
      splitName: 'Upper A',
      extenuating: false,
      sets: [{ exercise: 'Bench Press', weight: 105, reps: 7, rir: 2 }],
    },
    {
      id: 'upper-b-1',
      date: '2026-06-05',
      splitId: 'upper-b',
      splitName: 'Upper B',
      extenuating: true,
      sets: [{ exercise: 'Bench Press', weight: 110, reps: 4, rir: 0 }],
    },
  ];

  it('selects the top set per workout by load, then reps, then easier RIR', () => {
    const points = exerciseChartPoints(workouts, 'Bench Press');

    expect(points.map((point) => [point.id, point.raw, point.reps, point.rir, point.extenuating])).toEqual([
      ['upper-1', 105, 5, 1, false],
      ['upper-b-1', 110, 4, 0, true],
      ['upper-2', 105, 7, 2, false],
    ]);
  });

  it('scopes exercise trends to one specific workout split when requested', () => {
    const points = exerciseChartPoints(workouts, 'Bench Press', { mode: 'split', splitId: 'upper-a' });

    expect(points.map((point) => point.id)).toEqual(['upper-1', 'upper-2']);
  });

  it('labels progression from one session to the next with load, rep, and RIR changes', () => {
    const rows = exerciseProgressionRows(workouts, 'Bench Press', { mode: 'split', splitId: 'upper-a' });

    expect(rows.map((row) => [row.id, row.loadDelta, row.repsDelta, row.rirDelta, row.status, row.tone])).toEqual([
      ['upper-1', null, null, null, 'Baseline', 'neutral'],
      ['upper-2', 0, 2, 1, 'Reps up', 'good'],
    ]);
  });
});
