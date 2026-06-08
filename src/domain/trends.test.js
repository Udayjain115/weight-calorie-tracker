import { describe, expect, it } from 'vitest';
import { bodyWeightChartPoints } from './trends.js';

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
});
