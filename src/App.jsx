import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Dumbbell, LogOut, Scale } from 'lucide-react';
import { clearSession, getMe, getTrackerState, loadSession, saveSession, saveTrackerState } from './api/client';
import { commonExercises, createCycle, createStarterSplits } from './data/defaults';
import { calorieGuidance, getExerciseNames, summarizeStrength, weightTrend } from './domain/metrics';
import { exerciseName, getRepRangeForExercise, makeSplitExercise } from './domain/exerciseConfig';
import { analyzeWorkoutStrength } from './domain/strengthAnalysis';
import {
  deleteArchivedCycle as deleteArchivedCycleState,
  deleteSplit as deleteSplitState,
  removeSplitExercise,
  restoreArchivedCycle,
  restoreSplit,
  restoreSplitExercise,
} from './domain/stateMutations';
import { createFreshUserState, loadState, normalizeState, saveState } from './storage/appStorage';
import { today, rollingItems } from './utils/dates';
import { createId } from './utils/id';
import { poundsFromDisplay } from './utils/units';
import DashboardView from './views/DashboardView';
import AuthView from './views/AuthView';
import SplitsView from './views/SplitsView';
import WeightView from './views/WeightView';
import WorkoutView from './views/WorkoutView';

function App() {
  const [state, setState] = useState(loadState);
  const [session, setSession] = useState(loadSession);
  const [authLoading, setAuthLoading] = useState(Boolean(loadSession()?.token));
  const [syncError, setSyncError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [weightEntry, setWeightEntry] = useState({ date: today, weight: '' });
  const [splitEntry, setSplitEntry] = useState({ name: '', exercise: commonExercises[0], repMin: '4', repMax: '8' });
  const [customExercise, setCustomExercise] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(commonExercises[0]);
  const [exerciseScope, setExerciseScope] = useState({ mode: 'all', splitId: state.splits[0]?.id || '' });
  const [undoAction, setUndoAction] = useState(null);
  const [workoutEntry, setWorkoutEntry] = useState(() => ({
    date: today,
    splitId: state.splits[0]?.id || '',
    extenuating: false,
    reason: '',
    sets: [newWorkoutSet(exerciseName(state.splits[0]?.exercises[0]) || commonExercises[0])],
  }));

  const allExercises = useMemo(() => getExerciseNames(commonExercises, state), [state]);
  const trend = useMemo(() => weightTrend(state.bodyWeights), [state.bodyWeights]);
  const strengthAlerts = useMemo(() => summarizeStrength(state.workouts, state), [state]);
  const extenuatingCount = useMemo(() => rollingItems(state.workouts, 0, 14).filter((item) => item.extenuating).length, [state.workouts]);
  const guidance = calorieGuidance(trend, strengthAlerts, extenuatingCount, state.goalMode);

  useEffect(() => {
    if (!undoAction) return undefined;
    const timer = window.setTimeout(() => setUndoAction(null), 6000);
    return () => window.clearTimeout(timer);
  }, [undoAction]);

  useEffect(() => {
    if (!session?.token) return;

    let mounted = true;
    async function hydrateUser() {
      setAuthLoading(true);
      setSyncError('');
      try {
        await getMe(session.token);
        const remote = await getTrackerState(session.token);
        if (!mounted) return;
        if (remote.state) {
          const next = normalizeState(remote.state);
          setState(next);
          saveState(next);
        } else {
          const freshState = createFreshUserState();
          setState(freshState);
          saveState(freshState);
          await saveTrackerState(freshState, session.token);
        }
      } catch (error) {
        if (!mounted) return;
        if (error.status === 401) {
          clearSession();
          setSession(null);
          setSyncError('');
          return;
        }
        setSyncError(error.message);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    hydrateUser();
    return () => {
      mounted = false;
    };
  }, [session?.token]);

  function updateState(updater) {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      saveState(next);
      if (session?.token) {
        saveTrackerState(next, session.token).catch((error) => setSyncError(error.message));
      }
      return next;
    });
  }

  function showUndo(message, undo) {
    setUndoAction({ id: createId(), message, undo });
  }

  function runUndo() {
    if (!undoAction) return;
    undoAction.undo();
    setUndoAction(null);
  }

  function handleAuthenticated(nextSession) {
    saveSession(nextSession);
    setSession(nextSession);
  }

  function logout() {
    clearSession();
    setSession(null);
    setSyncError('');
  }

  function setUnit(unit) {
    updateState((current) => ({ ...current, unit }));
  }

  function addWeight() {
    if (!weightEntry.weight) return;
    const entry = {
      id: createId(),
      date: weightEntry.date,
      weight: poundsFromDisplay(weightEntry.weight, state.unit),
    };
    updateState((current) => ({
      ...current,
      bodyWeights: [...current.bodyWeights.filter((item) => item.date !== entry.date), entry].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    setWeightEntry({ date: today, weight: '' });
  }

  function addSet(exercise) {
    setWorkoutEntry((entry) => ({
      ...entry,
      sets: [...entry.sets, newWorkoutSet(exercise || entry.sets[0]?.exercise || allExercises[0])],
    }));
  }

  function saveWorkout() {
    const activeSplit = state.splits.find((split) => split.id === workoutEntry.splitId);
    const sets = workoutEntry.sets
      .map((set) => ({
        exercise: set.exercise,
        weight: poundsFromDisplay(set.weight, state.unit),
        reps: Number(set.reps),
        rir: set.rir === '' ? null : Number(set.rir),
        repRange: getRepRangeForExercise({ ...state, splits: activeSplit ? [activeSplit] : state.splits }, set.exercise),
      }))
      .filter((set) => set.exercise && set.weight > 0 && set.reps > 0 && set.rir !== null && set.rir >= 0);
    if (!sets.length) return;

    updateState((current) => {
      const workout = {
        id: createId(),
        date: workoutEntry.date,
        cycleId: current.activeCycleId,
        splitId: workoutEntry.splitId,
        splitName: current.splits.find((split) => split.id === workoutEntry.splitId)?.name || 'Custom',
        extenuating: workoutEntry.extenuating,
        reason: workoutEntry.extenuating ? workoutEntry.reason || 'Extenuating factor' : '',
        sets,
      };
      const analysis = analyzeWorkoutStrength(workout, current.workouts, current);
      const analyzedWorkout = {
        ...workout,
        strengthFlag: analysis.workoutFlag,
        strengthSummary: {
          comparedExerciseCount: analysis.comparedExerciseCount,
          losingExerciseCount: analysis.losingExerciseCount,
        },
        setStrengthFlags: analysis.setFlags.map((flag) => ({
          exercise: flag.exercise,
          setIndex: flag.setIndex,
          status: flag.status,
          reason: flag.reason,
          belowRepRange: flag.belowRepRange,
        })),
      };
      return {
        ...current,
        workouts: [analyzedWorkout, ...current.workouts],
      };
    });
    setWorkoutEntry((entry) => ({
      ...entry,
      date: today,
      extenuating: false,
      reason: '',
      sets: [newWorkoutSet(entry.sets[0]?.exercise || allExercises[0])],
    }));
  }

  function addSplitExercise() {
    if (!splitEntry.name.trim() || !splitEntry.exercise) return;
    const nextExercise = makeSplitExercise(splitEntry.exercise, splitEntry.repMin, splitEntry.repMax);
    const nextExerciseName = exerciseName(nextExercise);
    updateState((current) => {
      const existing = current.splits.find((split) => split.name.toLowerCase() === splitEntry.name.trim().toLowerCase());
      if (existing) {
        return {
          ...current,
          splits: current.splits.map((split) =>
            split.id === existing.id && !split.exercises.some((exercise) => exerciseName(exercise) === nextExerciseName)
              ? { ...split, exercises: [...split.exercises, nextExercise] }
              : split,
          ),
        };
      }
      return {
        ...current,
        splits: [...current.splits, { id: createId(), name: splitEntry.name.trim(), exercises: [nextExercise] }],
      };
    });
    setSplitEntry((entry) => ({ ...entry, exercise: allExercises[0] }));
  }

  function addCustomExercise() {
    const next = customExercise.trim();
    if (!next) return;
    updateState((current) => ({
      ...current,
      customExercises: current.customExercises.includes(next) ? current.customExercises : [...current.customExercises, next],
    }));
    setCustomExercise('');
    setSplitEntry((entry) => ({ ...entry, exercise: next }));
    setSelectedExercise(next);
  }

  function clearMockData() {
    updateState((current) => {
      const realCycles = current.cycles.filter((cycle) => !cycle.mock);
      const cycles = realCycles.length > 0 ? realCycles : [createCycle()];
      return {
        ...current,
        bodyWeights: current.bodyWeights.filter((entry) => !entry.mock),
        workouts: current.workouts.filter((entry) => !entry.mock),
        cycles,
        activeCycleId: cycles.find((cycle) => !cycle.archived)?.id || cycles[0].id,
        hasMockData: false,
        mockDataCleared: true,
      };
    });
  }

  function archiveCurrentCycle() {
    const nextSplits = createStarterSplits();
    updateState((current) => {
      const nextCycleNumber = current.cycles.length + 1;
      const nextCycle = createCycle(`Cycle ${nextCycleNumber}`, today);
      return {
        ...current,
        activeCycleId: nextCycle.id,
        cycles: [
          ...current.cycles.map((cycle) =>
            cycle.id === current.activeCycleId ? { ...cycle, archived: true, endDate: today, splitsSnapshot: current.splits } : cycle,
          ),
          nextCycle,
        ],
        splits: nextSplits,
      };
    });
    setSplitEntry({ name: '', exercise: commonExercises[0], repMin: '4', repMax: '8' });
    setWorkoutEntry({
      date: today,
      splitId: nextSplits[0]?.id || '',
      extenuating: false,
      reason: '',
      sets: [newWorkoutSet(exerciseName(nextSplits[0]?.exercises[0]) || commonExercises[0])],
    });
    setExerciseScope({ mode: 'all', splitId: nextSplits[0]?.id || '' });
  }

  function unarchiveCycle(cycleId) {
    updateState((current) => {
      const cycleToRestore = current.cycles.find((cycle) => cycle.id === cycleId);
      const restoredSplits = cycleToRestore?.splitsSnapshot?.length ? cycleToRestore.splitsSnapshot : current.splits;
      return {
        ...current,
        activeCycleId: cycleId,
        cycles: current.cycles.map((cycle) => {
          if (cycle.id === current.activeCycleId) {
            return { ...cycle, archived: true, endDate: today, splitsSnapshot: current.splits };
          }
          if (cycle.id === cycleId) {
            return { ...cycle, archived: false, endDate: '' };
          }
          return cycle;
        }),
        splits: restoredSplits,
      };
    });
    setExerciseScope({ mode: 'all', splitId: '' });
  }

  function deleteArchivedCycle(cycleId) {
    const cycle = state.cycles.find((item) => item.id === cycleId);
    if (!cycle?.archived) return;

    const deletedCycleIndex = state.cycles.findIndex((item) => item.id === cycleId);
    const deletedWorkouts = state.workouts.filter((workout) => workout.cycleId === cycleId);
    const confirmed = window.confirm(`Delete ${cycle.name} and its workout history? You can undo this briefly after deleting.`);
    if (!confirmed) return;

    updateState((current) => ({
      ...deleteArchivedCycleState(current, cycleId),
    }));
    showUndo(`Deleted ${cycle.name}`, () => {
      updateState((current) => restoreArchivedCycle(current, cycle, deletedCycleIndex, deletedWorkouts));
    });
  }

  function deleteSplit(splitId) {
    const split = state.splits.find((item) => item.id === splitId);
    if (!split) return;
    const splitIndex = state.splits.findIndex((item) => item.id === splitId);
    const fallbackSplit = state.splits.find((item) => item.id !== splitId);
    const wasSelectedSplit = workoutEntry.splitId === splitId;
    const previousWorkoutEntry = workoutEntry;

    updateState((current) => deleteSplitState(current, splitId));
    if (wasSelectedSplit) {
      setWorkoutEntry((entry) => ({
        ...entry,
        splitId: fallbackSplit?.id || '',
        sets: [newWorkoutSet(exerciseName(fallbackSplit?.exercises[0]) || allExercises[0])],
      }));
    }
    setExerciseScope((current) => (current.splitId === splitId ? { mode: 'all', splitId: '' } : current));
    showUndo(`Deleted ${split.name}`, () => {
      updateState((current) => restoreSplit(current, split, splitIndex));
      if (wasSelectedSplit) {
        setWorkoutEntry(previousWorkoutEntry);
      }
    });
  }

  function deleteSplitExercise(splitId, exerciseNameValue) {
    const split = state.splits.find((item) => item.id === splitId);
    if (!split) return;
    const exerciseIndex = split.exercises.findIndex((exercise) => exerciseName(exercise) === exerciseNameValue);
    const deletedExercise = split.exercises[exerciseIndex];
    const wasSelectedSplit = workoutEntry.splitId === splitId;
    const previousWorkoutEntry = workoutEntry;
    if (exerciseIndex < 0) return;

    updateState((current) => removeSplitExercise(current, splitId, exerciseNameValue));
    if (wasSelectedSplit) {
      setWorkoutEntry((entry) => ({
        ...entry,
        sets: entry.sets.filter((set) => set.exercise !== exerciseNameValue),
      }));
    }
    showUndo(`Removed ${exerciseNameValue} from ${split.name}`, () => {
      updateState((current) => restoreSplitExercise(current, splitId, exerciseNameValue, exerciseIndex, deletedExercise));
      if (wasSelectedSplit) {
        setWorkoutEntry(previousWorkoutEntry);
      }
    });
  }

  function selectedSplitExercises() {
    return state.splits.find((split) => split.id === workoutEntry.splitId)?.exercises.map(exerciseName) || allExercises;
  }

  if (!session?.token) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  if (authLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Strength Calories</p>
          <h1>Loading account</h1>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Strength Calories</p>
          <h1>Eat from your performance.</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-pill">{session.user?.email}</span>
          <div className="unit-toggle" role="group" aria-label="Weight units">
            <button className={state.unit === 'imperial' ? 'active' : ''} type="button" onClick={() => setUnit('imperial')}>
              lb
            </button>
            <button className={state.unit === 'metric' ? 'active' : ''} type="button" onClick={() => setUnit('metric')}>
              kg
            </button>
          </div>
          <button className="icon-button" title="Log out" onClick={logout}>
            <LogOut size={20} />
          </button>
        </div>
      </header>
      {syncError && (
        <div className="sync-banner" role="status">
          <span>{syncError}</span>
          <button type="button" className="sync-dismiss" onClick={() => setSyncError('')}>
            Dismiss
          </button>
        </div>
      )}
      {undoAction && (
        <div className="undo-banner" role="status">
          <span>{undoAction.message}</span>
          <button type="button" onClick={runUndo}>
            Undo
          </button>
        </div>
      )}

      <main>
        <nav className="tabs" aria-label="Primary">
          {[
            ['dashboard', BarChart3, 'Dashboard'],
            ['workout', Dumbbell, 'Workout'],
            ['weight', Scale, 'Weight'],
            ['splits', CalendarDays, 'Splits'],
          ].map(([id, Icon, label]) => (
            <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {activeTab === 'dashboard' && (
          <DashboardView
            allExercises={allExercises}
            extenuatingCount={extenuatingCount}
            guidance={guidance}
            selectedExercise={selectedExercise}
            exerciseScope={exerciseScope}
            setExerciseScope={setExerciseScope}
            setSelectedExercise={setSelectedExercise}
            state={state}
            strengthAlerts={strengthAlerts}
            trend={trend}
            clearMockData={clearMockData}
            updateCalories={(calories) => updateState((current) => ({ ...current, calories }))}
            updateGoalMode={(goalMode) => updateState((current) => ({ ...current, goalMode }))}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutView
            addSet={addSet}
            saveWorkout={saveWorkout}
            selectedSplitExercises={selectedSplitExercises}
            setWorkoutEntry={setWorkoutEntry}
            showUndo={showUndo}
            state={state}
            workoutEntry={workoutEntry}
          />
        )}

        {activeTab === 'weight' && (
          <WeightView addWeight={addWeight} setWeightEntry={setWeightEntry} state={state} weightEntry={weightEntry} />
        )}

        {activeTab === 'splits' && (
          <SplitsView
            addCustomExercise={addCustomExercise}
            addSplitExercise={addSplitExercise}
            allExercises={allExercises}
            customExercise={customExercise}
            setCustomExercise={setCustomExercise}
            setSplitEntry={setSplitEntry}
            splitEntry={splitEntry}
            state={state}
            archiveCurrentCycle={archiveCurrentCycle}
            unarchiveCycle={unarchiveCycle}
            deleteArchivedCycle={deleteArchivedCycle}
            deleteSplit={deleteSplit}
            deleteSplitExercise={deleteSplitExercise}
          />
        )}
      </main>
    </div>
  );
}

function newWorkoutSet(exercise) {
  return { id: createId(), exercise: exerciseName(exercise) || exercise, weight: '', reps: '', rir: '' };
}

export default App;
