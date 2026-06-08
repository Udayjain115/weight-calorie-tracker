import { describe, expect, it } from 'vitest';
import { displayExercise, getRepRangeForExercise, makeSplitExercise, normalizeExerciseEntry, setMeetsRepRange } from './exerciseConfig.js';

describe('exercise configuration', () => {
  it('normalizes legacy string exercises and configured exercises with valid rep ranges', () => {
    expect(normalizeExerciseEntry('Barbell Row')).toEqual({ name: 'Barbell Row', repRange: null });
    expect(normalizeExerciseEntry({ name: 'Bench Press', repMin: '4', repMax: '8' })).toEqual({
      name: 'Bench Press',
      repRange: { min: 4, max: 8 },
    });
  });

  it('rejects invalid rep ranges and falls back to the exercise name', () => {
    expect(makeSplitExercise('Curl', '12', '8')).toBe('Curl');
    expect(makeSplitExercise('Curl', '0', '8')).toBe('Curl');
    expect(normalizeExerciseEntry({ name: 'Curl', repMin: 12, repMax: 8 })).toEqual({ name: 'Curl', repRange: null });
  });

  it('formats configured exercises with their intended rep range', () => {
    expect(displayExercise({ name: 'Squat', repMin: 3, repMax: 5 })).toBe('Squat (3-5)');
    expect(displayExercise('Leg Curl')).toBe('Leg Curl');
  });

  it('finds rep ranges from active splits and archived cycle snapshots', () => {
    const state = {
      splits: [{ id: 'upper-a', exercises: [{ name: 'Bench Press', repMin: 4, repMax: 8 }] }],
      cycles: [{ id: 'old', splitsSnapshot: [{ id: 'old-upper', exercises: [{ name: 'Incline Press', repMin: 6, repMax: 10 }] }] }],
    };

    expect(getRepRangeForExercise(state, 'Bench Press')).toEqual({ min: 4, max: 8 });
    expect(getRepRangeForExercise(state, 'Incline Press')).toEqual({ min: 6, max: 10 });
    expect(getRepRangeForExercise(state, 'Missing')).toBeNull();
  });

  it('treats unconfigured exercises as valid and flags sets below configured minimum reps', () => {
    expect(setMeetsRepRange({ reps: 3 }, null)).toBe(true);
    expect(setMeetsRepRange({ reps: 3 }, { min: 4, max: 8 })).toBe(false);
    expect(setMeetsRepRange({ reps: 4 }, { min: 4, max: 8 })).toBe(true);
  });
});
