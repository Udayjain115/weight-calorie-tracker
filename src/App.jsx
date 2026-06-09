import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Dumbbell, LogOut, Scale, Settings } from 'lucide-react';
import { clearSession, getMe, getTrackerState, loadSession, saveSession, saveTrackerState } from './api/client';
import { commonExercises, createCycle, createStarterSplits } from './data/defaults';
import { calorieAverage, calorieGuidance, calorieTargetForToday, getExerciseNames, summarizeStrength, weightTrend } from './domain/metrics';
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
import { displayFromPounds, poundsFromDisplay } from './utils/units';
import DashboardView from './views/DashboardView';
import AuthView from './views/AuthView';
import SplitsView from './views/SplitsView';
import WeightView from './views/WeightView';
import WorkoutView from './views/WorkoutView';
import SettingsView from './views/SettingsView';
import OnboardingTutorial from './views/OnboardingTutorial';

function App() {
  const [state, setState] = useState(loadState);
  const [session, setSession] = useState(loadSession);
  const [authLoading, setAuthLoading] = useState(Boolean(loadSession()?.token));
  const [syncError, setSyncError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tutorialMode, setTutorialMode] = useState(() => loadState().trackingMode || 'full');
  const [weightEntry, setWeightEntry] = useState({ date: today, weight: '' });
  const [calorieEntry, setCalorieEntry] = useState({ date: today, calories: '' });
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
    editingWorkoutId: null,
    sets: [newWorkoutSet(exerciseName(state.splits[0]?.exercises[0]) || commonExercises[0])],
  }));

  const allExercises = useMemo(() => getExerciseNames(commonExercises, state), [state]);
  const trend = useMemo(() => weightTrend(state.bodyWeights), [state.bodyWeights]);
  const intakeAverage = useMemo(() => calorieAverage(state.calorieEntries), [state.calorieEntries]);
  const todayCalories = useMemo(() => calorieTargetForToday(state.calorieEntries || [], state.calories), [state.calorieEntries, state.calories]);
  const strengthAlerts = useMemo(() => summarizeStrength(state.workouts, state), [state]);
  const extenuatingCount = useMemo(() => rollingItems(state.workouts, 0, 14).filter((item) => item.extenuating).length, [state.workouts]);
  const guidance = calorieGuidance(trend, strengthAlerts, extenuatingCount, state.goalMode);
  const isLiftOnly = state.trackingMode === 'lifts';

  useEffect(() => {
    if (!undoAction) return undefined;
    const timer = window.setTimeout(() => setUndoAction(null), 6000);
    return () => window.clearTimeout(timer);
  }, [undoAction]);

  useEffect(() => {
    if (isLiftOnly && activeTab === 'weight') {
      setActiveTab('dashboard');
    }
  }, [activeTab, isLiftOnly]);

  useEffect(() => {
    if (state.splits.some((split) => split.id === workoutEntry.splitId)) return;
    const fallbackSplit = state.splits[0];
    if (!fallbackSplit) return;

    setWorkoutEntry((entry) => ({
      ...entry,
      splitId: fallbackSplit.id,
      sets: [newWorkoutSet(exerciseName(fallbackSplit.exercises[0]) || commonExercises[0])],
    }));
  }, [state.splits, workoutEntry.splitId]);

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

  function setTrackingMode(trackingMode) {
    updateState((current) => ({ ...current, trackingMode }));
  }

  function completeOnboarding() {
    updateState((current) => ({ ...current, trackingMode: tutorialMode, onboardingComplete: true }));
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

  function addCalories() {
    if (!calorieEntry.calories) return;
    const entry = {
      id: createId(),
      date: calorieEntry.date,
      calories: Number(calorieEntry.calories),
    };
    if (!Number.isFinite(entry.calories) || entry.calories <= 0) return;

    updateState((current) => ({
      ...current,
      calorieEntries: [...(current.calorieEntries || []).filter((item) => item.date !== entry.date), entry].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    setCalorieEntry({ date: today, calories: '' });
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
      const editingWorkoutId = workoutEntry.editingWorkoutId;
      const workout = {
        id: editingWorkoutId || createId(),
        date: workoutEntry.date,
        cycleId: current.activeCycleId,
        splitId: workoutEntry.splitId,
        splitName: current.splits.find((split) => split.id === workoutEntry.splitId)?.name || 'Custom',
        extenuating: workoutEntry.extenuating,
        reason: workoutEntry.extenuating ? workoutEntry.reason || 'Extenuating factor' : '',
        sets,
      };
      const matchingWorkout = current.workouts.find(
        (item) =>
          item.id !== workout.id &&
          item.date === workout.date &&
          ((item.splitId && item.splitId === workout.splitId) || (!item.splitId && item.splitName === workout.splitName)),
      );
      const mergedWorkout = matchingWorkout
        ? {
            ...matchingWorkout,
            date: workout.date,
            cycleId: workout.cycleId,
            splitId: workout.splitId,
            splitName: workout.splitName,
            extenuating: matchingWorkout.extenuating || workout.extenuating,
            reason: mergeWorkoutReasons(matchingWorkout.reason, workout.reason),
            sets: [...matchingWorkout.sets, ...workout.sets],
          }
        : workout;
      const comparisonWorkouts = current.workouts.filter((item) => item.id !== mergedWorkout.id && item.id !== workout.id);
      const analysis = analyzeWorkoutStrength(mergedWorkout, comparisonWorkouts, current);
      const analyzedWorkout = {
        ...mergedWorkout,
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
        workouts: [analyzedWorkout, ...comparisonWorkouts].sort((a, b) => b.date.localeCompare(a.date)),
      };
    });
    setWorkoutEntry((entry) => ({
      ...entry,
      date: today,
      extenuating: false,
      reason: '',
      editingWorkoutId: null,
      sets: [newWorkoutSet(entry.sets[0]?.exercise || allExercises[0])],
    }));
  }

  function editWorkout(workout) {
    const fallbackSplit = state.splits.find((split) => split.name === workout.splitName) || state.splits[0];
    const splitId = state.splits.some((split) => split.id === workout.splitId) ? workout.splitId : fallbackSplit?.id || '';
    setActiveTab('workout');
    setWorkoutEntry({
      date: workout.date,
      splitId,
      extenuating: Boolean(workout.extenuating),
      reason: workout.reason || '',
      editingWorkoutId: workout.id,
      sets: workout.sets.map((set) => ({
        id: createId(),
        exercise: set.exercise,
        weight: displayFromPounds(Number(set.weight), state.unit),
        reps: String(set.reps ?? ''),
        rir: set.rir === null || set.rir === undefined ? '' : String(set.rir),
      })),
    });
  }

  function cancelWorkoutEdit() {
    setWorkoutEntry((entry) => ({
      ...entry,
      date: today,
      extenuating: false,
      reason: '',
      editingWorkoutId: null,
      sets: [newWorkoutSet(entry.sets[0]?.exercise || allExercises[0])],
    }));
  }

  function deleteWorkout(workoutId) {
    const workout = state.workouts.find((item) => item.id === workoutId);
    if (!workout) return;

    updateState((current) => ({
      ...current,
      workouts: current.workouts.filter((item) => item.id !== workoutId),
    }));
    if (workoutEntry.editingWorkoutId === workoutId) {
      cancelWorkoutEdit();
    }
    showUndo(`Deleted ${workout.splitName} on ${workout.date}`, () => {
      updateState((current) => ({
        ...current,
        workouts: [workout, ...current.workouts.filter((item) => item.id !== workout.id)].sort((a, b) => b.date.localeCompare(a.date)),
      }));
    });
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
        calorieEntries: (current.calorieEntries || []).filter((entry) => !entry.mock),
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
      editingWorkoutId: null,
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
    const selectedSplit = state.splits.find((split) => split.id === workoutEntry.splitId) || state.splits[0];
    return selectedSplit?.exercises.map(exerciseName) || [];
  }

  if (!session?.token) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  if (authLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Workout Diet Tracker</p>
          <h1>Loading account</h1>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="topbar">
        <div>
          <p className="eyebrow">Workout Diet Tracker</p>
          <h1>{isLiftOnly ? 'Track the lifts that matter.' : 'Let training guide intake.'}</h1>
        </div>
        <div className="topbar-insights" aria-label="Current tracker summary">
          {!isLiftOnly && (
            <div>
              <span>{intakeAverage ? '7-day intake' : 'Daily target'}</span>
              <strong>{intakeAverage ? Math.round(intakeAverage.average).toLocaleString() : state.calories || 'Set target'}</strong>
            </div>
          )}
          <div>
            <span>Logged sessions</span>
            <strong>{state.workouts.length}</strong>
          </div>
          {isLiftOnly ? (
            <div>
              <span>Tracked splits</span>
              <strong>{state.splits.length}</strong>
            </div>
          ) : (
            <div>
              <span>Scale entries</span>
              <strong>{state.bodyWeights.length}</strong>
            </div>
          )}
        </div>
        <div className="topbar-actions">
          <span className="user-pill">{session.user?.email}</span>
          <button className="icon-button" title="Log out" onClick={logout}>
            <LogOut size={20} />
          </button>
        </div>
      </header>
      {!state.onboardingComplete && (
        <OnboardingTutorial selectedMode={tutorialMode} setSelectedMode={setTutorialMode} onComplete={completeOnboarding} />
      )}
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

      <main id="main-content">
        <nav className="tabs" aria-label="Primary">
          {[
            ['dashboard', BarChart3, 'Dashboard'],
            ['workout', Dumbbell, 'Workout'],
            ...(!isLiftOnly ? [['weight', Scale, 'Body']] : []),
            ['splits', CalendarDays, 'Splits'],
            ['settings', Settings, 'Settings'],
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
            intakeAverage={intakeAverage}
            todayCalories={todayCalories}
            trackingMode={state.trackingMode}
            clearMockData={clearMockData}
            updateCalories={(calories) => updateState((current) => ({ ...current, calories }))}
            updateGoalMode={(goalMode) => updateState((current) => ({ ...current, goalMode }))}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutView
            addSet={addSet}
            cancelWorkoutEdit={cancelWorkoutEdit}
            deleteWorkout={deleteWorkout}
            editWorkout={editWorkout}
            saveWorkout={saveWorkout}
            selectedSplitExercises={selectedSplitExercises}
            setWorkoutEntry={setWorkoutEntry}
            showUndo={showUndo}
            state={state}
            workoutEntry={workoutEntry}
          />
        )}

        {activeTab === 'weight' && (
          <WeightView
            addCalories={addCalories}
            addWeight={addWeight}
            calorieEntry={calorieEntry}
            intakeAverage={intakeAverage}
            todayCalories={todayCalories}
            setCalorieEntry={setCalorieEntry}
            setWeightEntry={setWeightEntry}
            state={state}
            weightEntry={weightEntry}
          />
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

        {activeTab === 'settings' && <SettingsView state={state} setTrackingMode={setTrackingMode} setUnit={setUnit} />}
      </main>
    </div>
  );
}

function newWorkoutSet(exercise) {
  return { id: createId(), exercise: exerciseName(exercise) || exercise, weight: '', reps: '', rir: '' };
}

function mergeWorkoutReasons(firstReason, secondReason) {
  const reasons = [firstReason, secondReason].map((reason) => reason?.trim()).filter(Boolean);
  return [...new Set(reasons)].join('; ');
}

export default App;
