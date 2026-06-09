import { starterState } from './defaults.js';
import { today } from '../utils/dates.js';
import { createId } from '../utils/id.js';

function dateDaysAgo(days) {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function mockSet(exercise, weight, reps, rir) {
  return { exercise, weight, reps, rir };
}

function mockCycle(name, startDaysAgo, endDaysAgo = '') {
  return {
    id: `mock-cycle-${createId()}`,
    name,
    startDate: dateDaysAgo(startDaysAgo),
    endDate: endDaysAgo === '' ? '' : dateDaysAgo(endDaysAgo),
    archived: endDaysAgo !== '',
    mock: true,
  };
}

function mockWorkout(daysAgo, split, cycleId, sets, extenuating = false, reason = '') {
  return {
    id: `mock-workout-${createId()}`,
    date: dateDaysAgo(daysAgo),
    cycleId,
    splitId: split.id,
    splitName: split.name,
    extenuating,
    reason,
    mock: true,
    sets,
  };
}

export function createMockState() {
  const [upperA, lowerA] = starterState.splits;
  const previousCycle = mockCycle('Mock Cycle 1', 35, 15);
  const activeCycle = mockCycle('Mock Cycle 2', 14);
  const bodyWeights = Array.from({ length: 16 }, (_, index) => {
    const daysAgo = 30 - index * 2;
    const drift = index * 0.06;
    const wave = Math.sin(index / 1.7) * 0.35;
    return {
      id: `mock-weight-${createId()}`,
      date: dateDaysAgo(daysAgo),
      weight: 181.2 + drift + wave,
      mock: true,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
  const calorieEntries = Array.from({ length: 14 }, (_, index) => {
    const wave = Math.sin(index / 2.1) * 130;
    return {
      id: `mock-calories-${createId()}`,
      date: dateDaysAgo(13 - index),
      calories: Math.round(2680 + wave),
      mock: true,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  const workouts = [
    mockWorkout(27, upperA, previousCycle.id, [
      mockSet('Barbell Bench Press', 185, 8, 2),
      mockSet('Barbell Row', 155, 10, 2),
      mockSet('Overhead Press', 95, 9, 2),
      mockSet('Lat Pulldown', 140, 11, 2),
    ]),
    mockWorkout(25, lowerA, previousCycle.id, [
      mockSet('Squat', 245, 8, 2),
      mockSet('Romanian Deadlift', 205, 9, 2),
      mockSet('Leg Curl', 90, 12, 2),
      mockSet('Calf Raise', 180, 12, 1),
    ]),
    mockWorkout(22, upperA, previousCycle.id, [
      mockSet('Barbell Bench Press', 185, 9, 2),
      mockSet('Barbell Row', 160, 9, 2),
      mockSet('Overhead Press', 100, 8, 2),
      mockSet('Lat Pulldown', 145, 10, 2),
    ]),
    mockWorkout(20, lowerA, previousCycle.id, [
      mockSet('Squat', 250, 8, 2),
      mockSet('Romanian Deadlift', 210, 8, 2),
      mockSet('Leg Curl', 95, 11, 2),
      mockSet('Calf Raise', 185, 12, 1),
    ]),
    mockWorkout(17, upperA, previousCycle.id, [
      mockSet('Barbell Bench Press', 190, 7, 2),
      mockSet('Barbell Row', 160, 10, 2),
      mockSet('Overhead Press', 100, 9, 2),
      mockSet('Lat Pulldown', 145, 11, 2),
    ]),
    mockWorkout(15, lowerA, previousCycle.id, [
      mockSet('Squat', 255, 7, 2),
      mockSet('Romanian Deadlift', 210, 9, 2),
      mockSet('Leg Curl', 95, 12, 2),
      mockSet('Calf Raise', 190, 11, 1),
    ]),
    mockWorkout(12, upperA, activeCycle.id, [
      mockSet('Barbell Bench Press', 185, 8, 2),
      mockSet('Barbell Row', 165, 8, 2),
      mockSet('Overhead Press', 105, 7, 2),
      mockSet('Lat Pulldown', 150, 9, 2),
    ]),
    mockWorkout(10, lowerA, activeCycle.id, [
      mockSet('Squat', 255, 8, 2),
      mockSet('Romanian Deadlift', 215, 8, 2),
      mockSet('Leg Curl', 100, 10, 2),
      mockSet('Calf Raise', 190, 12, 1),
    ]),
    mockWorkout(7, upperA, activeCycle.id, [
      mockSet('Barbell Bench Press', 185, 7, 1),
      mockSet('Barbell Row', 165, 9, 2),
      mockSet('Overhead Press', 105, 8, 2),
      mockSet('Lat Pulldown', 150, 10, 2),
    ]),
    mockWorkout(5, lowerA, activeCycle.id, [
      mockSet('Squat', 260, 6, 2),
      mockSet('Romanian Deadlift', 215, 9, 2),
      mockSet('Leg Curl', 100, 11, 2),
      mockSet('Calf Raise', 195, 11, 1),
    ]),
    mockWorkout(
      3,
      upperA,
      activeCycle.id,
      [
        mockSet('Barbell Bench Press', 185, 6, 1),
        mockSet('Barbell Row', 165, 8, 1),
        mockSet('Overhead Press', 105, 7, 1),
        mockSet('Lat Pulldown', 150, 8, 1),
      ],
      true,
      'Bad sleep',
    ),
    mockWorkout(1, lowerA, activeCycle.id, [
      mockSet('Squat', 260, 7, 2),
      mockSet('Romanian Deadlift', 220, 7, 2),
      mockSet('Leg Curl', 100, 12, 2),
      mockSet('Calf Raise', 195, 12, 1),
    ]),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return {
    ...starterState,
    calories: 2700,
    activeCycleId: activeCycle.id,
    cycles: [previousCycle, activeCycle],
    bodyWeights,
    calorieEntries,
    workouts,
    hasMockData: true,
    mockDataCleared: false,
  };
}
