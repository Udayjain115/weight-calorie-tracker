import { describe, expect, it } from 'vitest';
import { analyzeWorkoutStrength, summarizeStrength } from './strengthAnalysis.js';
import { cycleExerciseBreakdown } from './cycleMetrics.js';

const state = {
  activeCycleId: 'cycle-1',
  splits: [
    {
      id: 'upper-a',
      name: 'Upper A',
      exercises: [{ name: 'Bench Press', repMin: 4, repMax: 8 }, { name: 'Row', repMin: 6, repMax: 10 }, 'Curl'],
    },
  ],
  cycles: [{ id: 'cycle-1', name: 'Cycle 1', archived: false }],
};

function workout(id, date, sets) {
  return {
    id,
    date,
    cycleId: 'cycle-1',
    splitId: 'upper-a',
    splitName: 'Upper A',
    extenuating: false,
    sets,
  };
}

function priorWorkoutSet() {
  return [
    workout('bench-prior', '2026-05-20', [{ exercise: 'Bench Press', weight: 100, reps: 8, rir: 2 }]),
    workout('row-prior', '2026-05-20', [{ exercise: 'Row', weight: 80, reps: 8, rir: 2 }]),
    workout('curl-prior', '2026-05-20', [{ exercise: 'Curl', weight: 30, reps: 10, rir: 2 }]),
  ];
}

function statusRows(analysis) {
  return analysis.setFlags.map((flag) => [flag.exercise, flag.status]);
}

describe('rep range strength rules', () => {
  it('flags an under-range load drop against a valid peak, but does not let the under-range set become the peak', () => {
    const workouts = [
      workout('valid-peak', '2026-05-18', [{ exercise: 'Bench Press', weight: 100, reps: 8, rir: 2 }]),
      workout('under-range', '2026-05-30', [{ exercise: 'Bench Press', weight: 100, reps: 3, rir: 1 }]),
      workout('drop-after-under-range', '2026-06-06', [{ exercise: 'Bench Press', weight: 95, reps: 5, rir: 2 }]),
    ];

    const alerts = summarizeStrength(workouts, state);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      exercise: 'Bench Press',
      loadLost: 5,
      belowRepRange: false,
      reason: 'Load dropped below valid peak',
    });

    const [breakdown] = cycleExerciseBreakdown({ ...state, workouts }, ['Bench Press']);
    expect(breakdown.current).toMatchObject({ weight: 95, reps: 5 });
    expect(breakdown.currentPeak.baseline).toMatchObject({ weight: 100, reps: 8 });
  });

  it('flags the under-range set itself when it is the current evidence', () => {
    const workouts = [
      workout('valid-peak', '2026-05-18', [{ exercise: 'Bench Press', weight: 100, reps: 8, rir: 2 }]),
      workout('under-range', '2026-06-06', [{ exercise: 'Bench Press', weight: 100, reps: 3, rir: 1 }]),
    ];

    const alerts = summarizeStrength(workouts, state);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      exercise: 'Bench Press',
      repsLost: 5,
      belowRepRange: true,
      reason: 'Fewer reps at the same load and same or harder RIR',
    });
  });
});

describe('workout strength flags', () => {
  it('flags each comparable set and flags the workout only when most comparable exercises are down', () => {
    const current = workout('current', '2026-06-06', [
      { exercise: 'Bench Press', weight: 100, reps: 6, rir: 1 },
      { exercise: 'Row', weight: 75, reps: 8, rir: 2 },
      { exercise: 'Curl', weight: 32.5, reps: 8, rir: 2 },
    ]);

    const analysis = analyzeWorkoutStrength(current, priorWorkoutSet(), state);
    expect(statusRows(analysis)).toEqual([
      ['Bench Press', 'loss'],
      ['Row', 'loss'],
      ['Curl', 'gain'],
    ]);
    expect(analysis).toMatchObject({
      comparedExerciseCount: 3,
      losingExerciseCount: 2,
      workoutFlag: true,
    });
  });

  it('does not flag the whole workout when losses are not the majority', () => {
    const current = workout('current', '2026-06-06', [
      { exercise: 'Bench Press', weight: 100, reps: 6, rir: 1 },
      { exercise: 'Row', weight: 82.5, reps: 6, rir: 2 },
      { exercise: 'Curl', weight: 30, reps: 10, rir: 2 },
    ]);

    const analysis = analyzeWorkoutStrength(current, priorWorkoutSet(), state);
    expect(statusRows(analysis)).toEqual([
      ['Bench Press', 'loss'],
      ['Row', 'gain'],
      ['Curl', 'neutral'],
    ]);
    expect(analysis).toMatchObject({
      comparedExerciseCount: 3,
      losingExerciseCount: 1,
      workoutFlag: false,
    });
  });
});
