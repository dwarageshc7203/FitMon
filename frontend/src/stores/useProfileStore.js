import { create } from 'zustand';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { computeMuscleActivation } from '../utils/muscleMapping';
import { toDayKey, dayKeyToDate } from '../utils/dateUtils';
import { firebaseApp } from '../firebase/config';

const db = firebaseApp ? getFirestore(firebaseApp) : null;

const getSessionTimestamp = (session) => {
  const ts = session?.startedAt ?? session?.createdAt ?? session?.endedAt;
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
  const parsed = new Date(ts).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};


const computeStreak = (sessions) => {
  const dayKeys = new Set();
  sessions.forEach((session) => {
    const ts = getSessionTimestamp(session);
    if (ts) dayKeys.add(toDayKey(ts));
  });

  if (dayKeys.size === 0) return 0;

  const sorted = Array.from(dayKeys).sort((a, b) => new Date(b) - new Date(a));
  const todayKey = toDayKey(Date.now());
  const yesterdayKey = toDayKey(Date.now() - 24 * 60 * 60 * 1000);

  let startKey = null;
  if (sorted[0] === todayKey) startKey = todayKey;
  else if (sorted[0] === yesterdayKey) startKey = yesterdayKey;
  else return 0;

  let streakCount = 0;
  const cursor = dayKeyToDate(startKey);

  while (true) {
    const key = toDayKey(cursor);
    if (!dayKeys.has(key)) break;
    streakCount += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streakCount;
};

const useProfileStore = create((set, get) => ({
  goal: '',
  streak: 0,
  totalSessions: 0,
  accuracyRate: 0,
  recentSessions: [],
  heatmapByDay: {},
  selectedHeatmapDate: toDayKey(Date.now()),
  weeklyHeatmap: [],
  isHeatmapLoading: false,
  isLoading: false,
  error: null,
  heatmapError: null,

  fetchProfileMetrics: async (user) => {
    const uid = user?.uid;
    const email = user?.email;
    if (!db || (!uid && !email)) return;
    set({ isLoading: true, error: null });
    try {
      let userSnap = null;
      if (uid) {
        const userRef = doc(db, 'users', uid);
        userSnap = await getDoc(userRef);
      }
      let streak = 0;
      let goal = 'Improve form and prevent injury';

      if (userSnap && userSnap.exists()) {
        const data = userSnap.data();
        streak = data.streak || 0;
        goal = data.goal || goal;
      }

      const sessionsRef = collection(db, 'sessions');
      const queries = [];
      if (uid) queries.push(getDocs(query(sessionsRef, where('userId', '==', uid))));
      if (email) queries.push(getDocs(query(sessionsRef, where('email', '==', email))));

      const snapshots = await Promise.all(queries);
      const sessionMap = new Map();
      snapshots.forEach((snap) => {
        snap.forEach((docSnap) => {
          sessionMap.set(docSnap.id, docSnap.data());
        });
      });
      
      let totalSessions = 0;
      let accurateSessions = 0;
      const allSessions = [];

      sessionMap.forEach((sData) => {
        totalSessions++;
        allSessions.push(sData);
        if ((sData.avgPostureScore || 0) >= 70) {
          accurateSessions++;
        }
      });

      const computedStreak = computeStreak(allSessions);
      if (computedStreak > 0) streak = computedStreak;

      // Sort computationally to avoid needing a composite index
      allSessions.sort((a, b) => (getSessionTimestamp(b) || 0) - (getSessionTimestamp(a) || 0));
      const recentSessions = allSessions.slice(0, 3);

      const accuracyRate = totalSessions > 0 ? Math.round((accurateSessions / totalSessions) * 100) : 0;

      set({ 
        streak, 
        goal, 
        totalSessions, 
        accuracyRate, 
        recentSessions,
        isLoading: false 
      });
    } catch (e) {
      set({ error: e.message, isLoading: false });
    }
  },

  updateGoal: async (uid, newGoal) => {
    if (!db || !uid) return;
    try {
      const userRef = doc(db, 'users', uid);
      try {
        await updateDoc(userRef, { goal: newGoal });
      } catch (err) {
        if (err.code === 'not-found') {
          await setDoc(userRef, { goal: newGoal }, { merge: true });
        } else {
          throw err;
        }
      }
      set({ goal: newGoal });
    } catch (e) {
      set({ error: e.message });
    }
  }
  ,
  setHeatmapDate: (dateKey) => set({ selectedHeatmapDate: dateKey }),

  fetchHeatmapDay: async (uid, dateKey) => {
    if (!db || !uid || !dateKey) return;
    set({ isHeatmapLoading: true, heatmapError: null });
    try {
      const userRef = doc(db, 'users', uid);
      const dayRef = doc(collection(userRef, 'workoutDays'), dateKey);
      const snap = await getDoc(dayRef);
      const exercises = snap.exists() ? (snap.data().exercises || []) : [];
      set((state) => ({
        heatmapByDay: { ...state.heatmapByDay, [dateKey]: exercises },
        isHeatmapLoading: false,
      }));
    } catch (e) {
      set({ heatmapError: e.message, isHeatmapLoading: false });
    }
  },

  saveHeatmapDay: async (uid, dateKey, exercises) => {
    if (!dateKey) return;
    const previous = get().heatmapByDay[dateKey];
    const previousWeeklyHeatmap = get().weeklyHeatmap;
    const { counts } = computeMuscleActivation(exercises);
    const activationCount = Object.values(counts).reduce((sum, value) => sum + value, 0);
    set((state) => ({
      heatmapByDay: { ...state.heatmapByDay, [dateKey]: exercises },
      weeklyHeatmap: state.weeklyHeatmap.map((day) => (
        day.dateKey === dateKey
          ? { ...day, exercises, activationCount }
          : day
      )),
      heatmapError: null,
    }));
    if (!db || !uid) {
      set({
        heatmapByDay: { ...get().heatmapByDay, [dateKey]: previous || [] },
        weeklyHeatmap: previousWeeklyHeatmap,
        heatmapError: !uid ? 'Sign in to save workout progress.' : 'Database unavailable.',
      });
      return;
    }
    try {
      const userRef = doc(db, 'users', uid);
      const dayRef = doc(collection(userRef, 'workoutDays'), dateKey);
      await setDoc(dayRef, {
        dateKey,
        exercises,
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (e) {
      set({
        heatmapByDay: { ...get().heatmapByDay, [dateKey]: previous || [] },
        weeklyHeatmap: previousWeeklyHeatmap,
        heatmapError: e.message,
      });
    }
  },

  fetchWeeklyHeatmap: async (uid, endDateKey) => {
    if (!db || !uid) return;
    const endKey = endDateKey || toDayKey(Date.now());
    const endDate = dayKeyToDate(endKey);
    const dayKeys = [];
    for (let i = 6; i >= 0; i -= 1) {
      const cursor = new Date(endDate);
      cursor.setDate(endDate.getDate() - i);
      dayKeys.push(toDayKey(cursor));
    }

    set({ isHeatmapLoading: true, heatmapError: null });
    try {
      const userRef = doc(db, 'users', uid);
      const results = await Promise.all(
        dayKeys.map(async (key) => {
          const dayRef = doc(collection(userRef, 'workoutDays'), key);
          const snap = await getDoc(dayRef);
          const exercises = snap.exists() ? (snap.data().exercises || []) : [];
          const { counts } = computeMuscleActivation(exercises);
          const activationCount = Object.values(counts).reduce((sum, value) => sum + value, 0);
          return { dateKey: key, exercises, activationCount };
        })
      );
      set({ weeklyHeatmap: results, isHeatmapLoading: false });
    } catch (e) {
      set({ heatmapError: e.message, isHeatmapLoading: false });
    }
  },
}));

export default useProfileStore;
