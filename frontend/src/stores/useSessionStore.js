import { create } from 'zustand';

// Rep quality persists until a new rep updates it.

const useSessionStore = create((set, get) => ({
  isConnected: false,
  socketError: '',
  sessionId: null,
  sessionActive: false,
  coachSessionCode: '',
  coachedReports: [],
  athleteVideoFrame: null,
  repCount: 0,
  angle: 0,
  repState: 'IDLE',
  repQuality: null,
  repCorrect: null,
  lastRepQualityAt: 0,
  postureScore: 0,
  formScore: 0,
  elbowStability: 100,
  smoothness: 100,
  cvScore: 0,
  fsrScore: 0,
  averageFsr: 0,
  engagementStatus: 'normal',
  riskLevel: 'low',
  fatigueLevel: 'none',
  confidenceScore: 50,
  feedbackMessages: [],
  report: null,
  lastCompletedReport: null,
  isGeneratingReport: false,
  poseReady: false,
  setConnected: (isConnected) => set({ isConnected }),
  setSocketError: (socketError) => set({ socketError }),
  setSessionId: (sessionId) => set({ sessionId, socketError: '' }),
  setSessionActive: (sessionActive) => set({ sessionActive }),
  setCoachSessionCode: (coachSessionCode) => set({ coachSessionCode }),
  setAthleteVideoFrame: (athleteVideoFrame) => set({ athleteVideoFrame }),
  pushCoachedReport: (report) =>
    set((state) => ({
      coachedReports: [report, ...state.coachedReports].slice(0, 10),
    })),
  setPoseReady: (poseReady) => set({ poseReady }),
  setGeneratingReport: (isGeneratingReport) => set({ isGeneratingReport }),
  resetLiveFeedback: () =>
    set({
      repCount: 0,
      angle: 0,
      repState: 'IDLE',
      repQuality: null,
      repCorrect: null,
      lastRepQualityAt: 0,
      postureScore: 0,
      formScore: 0,
      elbowStability: 100,
      smoothness: 100,
      cvScore: 0,
      fsrScore: 0,
      averageFsr: 0,
      engagementStatus: 'normal',
      riskLevel: 'low',
      fatigueLevel: 'none',
      confidenceScore: 50,
      feedbackMessages: [],
    }),
  setReport: (report) =>
    set({
      report,
      lastCompletedReport: report,
      isGeneratingReport: false,
      sessionActive: false,
    }),
  updateFeedback: (data) => {
    const current = get();
    const updates = {
      repCount: data.repCount ?? current.repCount,
      angle: data.angle ?? current.angle,
      repState: data.repState ?? current.repState,
      repQuality: data.repQuality ?? current.repQuality,
      repCorrect: data.repCorrect ?? current.repCorrect,
      postureScore: data.postureScore ?? current.postureScore,
      formScore: data.formScore ?? current.formScore,
      elbowStability: data.elbowStability ?? current.elbowStability,
      smoothness: data.smoothness ?? current.smoothness,
      cvScore: data.cvScore ?? current.cvScore,
      fsrScore: data.fsrScore ?? current.fsrScore,
      averageFsr: data.averageFsr ?? current.averageFsr,
      engagementStatus: data.engagementStatus ?? current.engagementStatus,
      riskLevel: data.riskLevel ?? current.riskLevel,
      fatigueLevel: data.fatigueLevel ?? current.fatigueLevel,
      confidenceScore: data.confidenceScore ?? current.confidenceScore,
      repQuality: data.repQuality != null ? data.repQuality : current.repQuality,
      repCorrect: data.repCorrect != null ? data.repCorrect : current.repCorrect,
    };

    if (data.repQuality != null) {
      updates.lastRepQualityAt = Date.now();
    }

    if (data.feedback?.length) {
      const timestamp = Date.now();
      const incoming = data.feedback.map((message, index) => ({
        id: `${timestamp}-${index}`,
        text: message,
        timestamp,
      }));

      updates.feedbackMessages = [...incoming, ...current.feedbackMessages].slice(0, 6);
    }

    set(updates);
  },
  resetSession: () =>
    set({
      socketError: '',
      sessionId: null,
      sessionActive: false,
      coachSessionCode: '',
      athleteVideoFrame: null,
      repCount: 0,
      angle: 0,
      repState: 'IDLE',
      repQuality: null,
      repCorrect: null,
      lastRepQualityAt: 0,
      postureScore: 0,
      formScore: 0,
      elbowStability: 100,
      smoothness: 100,
      cvScore: 0,
      fsrScore: 0,
      averageFsr: 0,
      engagementStatus: 'normal',
      riskLevel: 'low',
      fatigueLevel: 'none',
      confidenceScore: 50,
      feedbackMessages: [],
      report: null,
      coachedReports: [],
      isGeneratingReport: false,
    }),
}));

export default useSessionStore;
