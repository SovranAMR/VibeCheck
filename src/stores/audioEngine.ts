import { create } from 'zustand';
import { AudioEngine } from '@/types';
import { persist } from 'zustand/middleware';

interface AudioEngineStore extends AudioEngine {
  // State
  isInitialized: boolean;
  isPlaying: boolean;
  currentFrequency: number | null;
  analyser: AnalyserNode | null;
  
  // Actions
  init: () => Promise<void>;
  playTone: (frequency: number, duration: number, shape?: OscillatorType) => Promise<void>;
  stopTone: () => void;
}

export const useAudioEngine = create<AudioEngineStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isInitialized: false,
      isUnlocked: false,
      ctx: null,
      master: null,
      analyser: null,
      isPlaying: false,
      currentFrequency: null,

      // Initialize audio context and master gain
      init: async () => {
        try {
          // Check if we're in browser environment
          if (typeof window === 'undefined') return;
          
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) {
            console.warn('AudioContext not supported');
            return;
          }
          
          const ctx = new AudioContextClass();
          const master = ctx.createGain();
          master.gain.value = 0.8; // Higher volume for mobile
          master.connect(ctx.destination);
          
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 2048;
          master.connect(analyser); // Connect master to analyser

          console.log('Audio engine initialized');
          set({
            isInitialized: true,
            ctx,
            master,
            analyser, // Store the analyser in the state
          });
          
          // Auto-unlock on first user interaction for iOS
          const unlockAudio = async () => {
            try {
              if (ctx.state === 'suspended') {
                await ctx.resume();
              }
              
              // Play silent buffer to unlock iOS audio
              const buffer = ctx.createBuffer(1, 1, 22050);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(0);
              
              set({ isUnlocked: true });
              
              // Remove listeners after unlock
              document.removeEventListener('touchstart', unlockAudio);
              document.removeEventListener('touchend', unlockAudio);
              document.removeEventListener('click', unlockAudio);
            } catch (error) {
              console.error('Audio unlock failed:', error);
            }
          };
          
          // Listen for first user interaction
          document.addEventListener('touchstart', unlockAudio, { once: true });
          document.addEventListener('touchend', unlockAudio, { once: true });
          document.addEventListener('click', unlockAudio, { once: true });
          
        } catch (error) {
          console.error('Audio context initialization failed:', error);
        }
      },

      // Unlock audio context (iOS Safari requirement)
      unlock: async () => {
        const { ctx } = get();
        if (!ctx) return;
        
        try {
          // Resume context if suspended
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          
          // Play silent tone to unlock
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.value = 0;
          
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
          
          set({ isUnlocked: true });
        } catch (error) {
          console.error('Audio unlock failed:', error);
        }
      },

      // Set master volume
      setMasterVolume: (gainValue: number) => {
        const { master } = get();
        if (master) {
          master.gain.value = Math.max(0, Math.min(1, gainValue));
        }
      },

      // Create and play tone with consistent, beautiful sound
      makeTone: async (fHz: number, durationSec: number, shape: OscillatorType = 'sine', easing: boolean = true) => {
        const { ctx, master, isUnlocked } = get();
        
        console.log('makeTone called:', { fHz, durationSec, shape, hasCtx: !!ctx, hasMaster: !!master, isUnlocked });
        
        if (!ctx || !master) {
          console.warn('Audio context not initialized');
          return;
        }
        
        // Force resume context if suspended (iOS fix)
        if (ctx.state === 'suspended') {
          try {
            await ctx.resume();
            console.log('Audio context resumed for makeTone');
          } catch (error) {
            console.error('Failed to resume audio context:', error);
            return;
          }
        }
        
        // Auto-unlock if not unlocked yet
        if (!isUnlocked) {
          try {
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            set({ isUnlocked: true });
            console.log('Audio unlocked automatically in makeTone');
          } catch (error) {
            console.error('Auto-unlock failed:', error);
            return;
          }
        }

        try {
          // Create main oscillator with rich, beautiful sound
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          // Create multiple harmonics for richness
          const harmonic2 = ctx.createOscillator(); // Octave
          const harmonic3 = ctx.createOscillator(); // Perfect fifth
          const harmonic2Gain = ctx.createGain();
          const harmonic3Gain = ctx.createGain();
          
          // Create gentle tremolo for natural feel
          const tremoloOsc = ctx.createOscillator();
          const tremoloGain = ctx.createGain();
          
          // Create subtle vibrato
          const vibratoOsc = ctx.createOscillator();
          const vibratoGain = ctx.createGain();
          
          // Create gentle chorus effect
          const chorusOsc = ctx.createOscillator();
          const chorusGain = ctx.createGain();
          
          // Setup main oscillator
          osc.type = 'sine';
          osc.frequency.value = fHz;
          
          // Setup harmonics for rich, warm sound
          harmonic2.type = 'sine';
          harmonic2.frequency.value = fHz * 2; // Octave
          harmonic2Gain.gain.value = 0.025; // Subtle octave
          
          harmonic3.type = 'sine';
          harmonic3.frequency.value = fHz * 1.5; // Perfect fifth
          harmonic3Gain.gain.value = 0.015; // Very subtle fifth
          
          // Setup tremolo (gentle volume modulation)
          tremoloOsc.type = 'sine';
          tremoloOsc.frequency.value = 3.5; // Gentle 3.5Hz tremolo
          tremoloGain.gain.value = 0.08; // Slightly more noticeable
          
          // Setup vibrato (subtle pitch variation)
          vibratoOsc.type = 'sine';
          vibratoOsc.frequency.value = 4.5; // Gentle 4.5Hz vibrato
          vibratoGain.gain.value = fHz * 0.0012; // Slightly more vibrato
          
          // Setup chorus (very subtle detuning)
          chorusOsc.type = 'sine';
          chorusOsc.frequency.value = 0.8; // Slow chorus
          chorusGain.gain.value = fHz * 0.0003; // Very subtle detuning
          
          // Connect audio graph
          osc.connect(gain);
          harmonic2.connect(harmonic2Gain);
          harmonic3.connect(harmonic3Gain);
          harmonic2Gain.connect(gain);
          harmonic3Gain.connect(gain);
          gain.connect(master);
          
          // Connect modulation
          tremoloOsc.connect(tremoloGain);
          tremoloGain.connect(gain.gain);
          
          vibratoOsc.connect(vibratoGain);
          vibratoGain.connect(osc.frequency);
          
          // Connect chorus effect
          chorusOsc.connect(chorusGain);
          chorusGain.connect(osc.frequency);
          
          const now = ctx.currentTime;
          const fadeTime = easing ? 0.1 : 0;
          
          // Set initial volume
          gain.gain.setValueAtTime(0, now);
          
          // Smooth fade in/out
          if (fadeTime > 0) {
            gain.gain.linearRampToValueAtTime(0.4, now + fadeTime);
            gain.gain.linearRampToValueAtTime(0.4, now + durationSec - fadeTime);
            gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
          } else {
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
          }
          
          // Start all oscillators
          osc.start(now);
          harmonic2.start(now);
          harmonic3.start(now);
          tremoloOsc.start(now);
          vibratoOsc.start(now);
          chorusOsc.start(now);
          
          // Schedule stops
          osc.stop(now + durationSec);
          harmonic2.stop(now + durationSec);
          harmonic3.stop(now + durationSec);
          tremoloOsc.stop(now + durationSec);
          vibratoOsc.stop(now + durationSec);
          chorusOsc.stop(now + durationSec);
          
          // Update state
          set({ isPlaying: true, currentFrequency: fHz });
          
          console.log('Tone started successfully:', fHz, 'Hz for', durationSec, 'seconds');
          
          // Clean up when finished
          return new Promise<void>((resolve) => {
            osc.onended = () => {
              set({ isPlaying: false, currentFrequency: null });
              console.log('Tone ended:', fHz, 'Hz');
              resolve();
            };
          });
          
        } catch (error) {
          console.error('Error in makeTone:', error);
          set({ isPlaying: false, currentFrequency: null });
        }
      },

      // Play tone with state management
      playTone: async (frequency: number, duration: number, shape: OscillatorType = 'sine') => {
        const { makeTone } = get();
        await makeTone(frequency, duration, shape, true);
      },

      // Stop current tone
      stopTone: () => {
        const { ctx } = get();
        if (ctx) {
          // Note: We can't stop individual oscillators once started
          // This is more for UI state management
          set({ isPlaying: false, currentFrequency: null });
        }
      }
    }),
    {
      name: 'audio-engine-storage',
      partialize: (state) => ({ isUnlocked: state.isUnlocked }),
    }
  )
);
