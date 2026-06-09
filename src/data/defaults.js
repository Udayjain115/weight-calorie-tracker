import { createId } from '../utils/id.js';

export const commonExercises = [
  'Barbell Bench Press',
  'Incline Dumbbell Press',
  'Overhead Press',
  'Pull Up',
  'Lat Pulldown',
  'Barbell Row',
  'Squat',
  'Leg Press',
  'Romanian Deadlift',
  'Deadlift',
  'Leg Curl',
  'Calf Raise',
  'Biceps Curl',
  'Triceps Pressdown',
];

export const starterSplits = [
  {
    id: createId(),
    name: 'Upper A',
    exercises: ['Barbell Bench Press', 'Barbell Row', 'Overhead Press', 'Lat Pulldown'],
  },
  {
    id: createId(),
    name: 'Lower A',
    exercises: ['Squat', 'Romanian Deadlift', 'Leg Curl', 'Calf Raise'],
  },
];

export function createStarterSplits() {
  return [
    {
      id: createId(),
      name: 'Upper A',
      exercises: ['Barbell Bench Press', 'Barbell Row', 'Overhead Press', 'Lat Pulldown'],
    },
    {
      id: createId(),
      name: 'Lower A',
      exercises: ['Squat', 'Romanian Deadlift', 'Leg Curl', 'Calf Raise'],
    },
  ];
}

export function createCycle(name = 'Cycle 1', startDate = new Date().toISOString().slice(0, 10)) {
  return {
    id: createId(),
    name,
    startDate,
    endDate: '',
    archived: false,
  };
}

const initialCycle = createCycle();

export const starterState = {
  unit: 'imperial',
  trackingMode: 'full',
  onboardingComplete: false,
  goalMode: 'maingain',
  calories: 2600,
  activeCycleId: initialCycle.id,
  cycles: [initialCycle],
  splits: starterSplits,
  customExercises: [],
  bodyWeights: [],
  calorieEntries: [],
  workouts: [],
  hasMockData: false,
  mockDataCleared: false,
};
