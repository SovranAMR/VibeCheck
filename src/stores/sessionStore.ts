import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Session, QuickFeel, FixedFreqItem, FreePick, TestProgress } from '@/types';

interface SessionStore {
  // Current session data
  session: Partial<Session>;
  progress: TestProgress;
  
  // Actions
  initSession: () => void;
  addPrefeelData: (data: QuickFeel) => void;
  addFixedFreqData: (data: FixedFreqItem) => void;
  setFreepickData: (data: FreePick) => void;
  setChronoData: (data: any) => void;
  setStabilityData: (data: any) => void;
  setToneData: (data: any) => void;
  setBreathData: (data: any) => void;
  setScores: (scores: any) => void;
  setAura: (aura: any) => void;
  completeStep: (step: string) => void;
  setCurrentStep: (step: string) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      session: {},
      progress: {
        currentStep: 'landing',
        completedSteps: [],
        sessionData: {}
      },

      initSession: () => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set({
          session: {
            id: sessionId,
            createdAt: Date.now(),
            prefeel: [],
            fixed: [],
          },
          progress: {
            currentStep: 'start',
            completedSteps: [],
            sessionData: {}
          }
        });
      },

      addPrefeelData: (data: QuickFeel) => {
        const { session } = get();
        const currentPrefeel = session.prefeel || [];
        set({
          session: {
            ...session,
            prefeel: [...currentPrefeel, data]
          }
        });
      },

      addFixedFreqData: (data: FixedFreqItem) => {
        const { session } = get();
        const currentFixed = session.fixed || [];
        set({
          session: {
            ...session,
            fixed: [...currentFixed, data]
          }
        });
      },

      setFreepickData: (data: FreePick) => {
        const { session } = get();
        set({
          session: {
            ...session,
            freepick: data
          }
        });
      },

      setChronoData: (data: any) => {
        const { session } = get();
        set({
          session: {
            ...session,
            chrono: data
          }
        });
      },

      setStabilityData: (data: any) => {
        const { session } = get();
        set({
          session: {
            ...session,
            stability: data
          }
        });
      },

      setToneData: (data: any) => {
        const { session } = get();
        set({
          session: {
            ...session,
            tone: data
          }
        });
      },

      setBreathData: (data: any) => {
        const { session } = get();
        set({
          session: {
            ...session,
            breath: data
          }
        });
      },

      setScores: (scores: any) => {
        const { session } = get();
        set({
          session: {
            ...session,
            scores
          }
        });
      },

      setAura: (aura: any) => {
        const { session } = get();
        set({
          session: {
            ...session,
            aura
          }
        });
      },

      completeStep: (step: string) => {
        const { progress } = get();
        if (!progress.completedSteps.includes(step)) {
          set({
            progress: {
              ...progress,
              completedSteps: [...progress.completedSteps, step]
            }
          });
        }
      },

      setCurrentStep: (step: string) => {
        const { progress } = get();
        set({
          progress: {
            ...progress,
            currentStep: step
          }
        });
      },

      resetSession: () => {
        set({
          session: {},
          progress: {
            currentStep: 'landing',
            completedSteps: [],
            sessionData: {}
          }
        });
      }
    }),
    {
      name: 'frequency-session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        session: state.session,
        progress: state.progress 
      }),
    }
  )
);
