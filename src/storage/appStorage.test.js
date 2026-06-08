import { describe, expect, it } from 'vitest';
import { normalizeState } from './appStorage.js';

describe('saved tracker state normalization', () => {
  it('fills missing collections and coerces basic preferences to supported values', () => {
    const state = normalizeState({
      unit: 'stones',
      goalMode: 'bulk-fast',
      calories: '2700',
      cycles: [{ id: 'cycle-1' }],
      splits: [{ id: 'upper-a', name: 'Upper A', exercises: ['Bench Press'] }],
    });

    expect(state).toMatchObject({
      unit: 'imperial',
      goalMode: 'maingain',
      calories: 2700,
      activeCycleId: 'cycle-1',
      customExercises: [],
      bodyWeights: [],
      workouts: [],
    });
  });

  it('normalizes split exercises while preserving valid configured rep ranges', () => {
    const state = normalizeState({
      cycles: [{ id: 'cycle-1' }],
      splits: [
        {
          id: 'upper-a',
          name: 'Upper A',
          exercises: [
            { name: 'Bench Press', repMin: '4', repMax: '8' },
            { name: 'Curl', repMin: '12', repMax: '8' },
          ],
        },
      ],
    });

    expect(state.splits[0].exercises).toEqual([{ name: 'Bench Press', repMin: 4, repMax: 8 }, 'Curl']);
  });

  it('assigns workouts without a cycle to the active cycle for legacy saved data', () => {
    const state = normalizeState({
      activeCycleId: 'cycle-1',
      cycles: [{ id: 'cycle-1' }],
      splits: [{ id: 'upper-a', name: 'Upper A', exercises: ['Bench Press'] }],
      workouts: [{ id: 'workout-1', date: '2026-06-08', sets: [] }],
    });

    expect(state.workouts[0]).toMatchObject({ id: 'workout-1', cycleId: 'cycle-1' });
  });
});
