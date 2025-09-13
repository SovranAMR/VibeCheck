import { create } from 'zustand';
import { AudioEngine } from '@/types';
import { persist } from 'zustand/middleware';

interface AudioEngineStore extends AudioEngine {
  // State
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

      // Create and play tone with fade-in/out
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
          // Create stereo panner for binaural effect
          const pannerL = ctx.createStereoPanner();
          const pannerR = ctx.createStereoPanner();
          pannerL.pan.value = -1; // Full left
          pannerR.pan.value = 1;  // Full right
          
          // Create main oscillators (binaural - slightly different frequencies)
          const oscL = ctx.createOscillator();
          const oscR = ctx.createOscillator();
          const gainL = ctx.createGain();
          const gainR = ctx.createGain();
          
          // Binaural beat calculation (8-10 Hz difference for alpha/theta waves)
          const binauralDiff = 8; // Hz difference for relaxation
          const leftFreq = fHz;
          const rightFreq = fHz + binauralDiff;
          
          // Create harmonics for richness (very subtle)
          const harmonic2L = ctx.createOscillator();
          const harmonic2R = ctx.createOscillator();
          const harmonic2GainL = ctx.createGain();
          const harmonic2GainR = ctx.createGain();
          
          // Setup harmonics (octave up, very quiet)
          harmonic2L.frequency.value = leftFreq * 2;
          harmonic2R.frequency.value = rightFreq * 2;
          harmonic2GainL.gain.value = 0.05; // Very subtle
          harmonic2GainR.gain.value = 0.05;
          
          // Create tremolo for natural breathing feel
          const tremoloOsc = ctx.createOscillator();
          const tremoloGain = ctx.createGain();
          tremoloOsc.type = 'sine';
          tremoloOsc.frequency.value = 3.8; // Slower, more meditative
          tremoloGain.gain.value = 0.08; // More subtle for meditation
          
          // Create vibrato (very gentle)
          const vibratoOsc = ctx.createOscillator();
          const vibratoGainL = ctx.createGain();
          const vibratoGainR = ctx.createGain();
          vibratoOsc.type = 'sine';
          vibratoOsc.frequency.value = 4.2; // Gentle vibrato
          vibratoGainL.gain.value = leftFreq * 0.001; // Very subtle
          vibratoGainR.gain.value = rightFreq * 0.001;
          
          // Connect main audio graph
          oscL.connect(gainL);
          oscR.connect(gainR);
          gainL.connect(pannerL);
          gainR.connect(pannerR);
          pannerL.connect(master);
          pannerR.connect(master);
          
          // Connect harmonics
          harmonic2L.connect(harmonic2GainL);
          harmonic2R.connect(harmonic2GainR);
          harmonic2GainL.connect(pannerL);
          harmonic2GainR.connect(pannerR);
          
          // Connect modulation
          tremoloOsc.connect(tremoloGain);
          tremoloGain.connect(gainL.gain);
          tremoloGain.connect(gainR.gain);
          
          vibratoOsc.connect(vibratoGainL);
          vibratoOsc.connect(vibratoGainR);
          vibratoGainL.connect(oscL.frequency);
          vibratoGainR.connect(oscR.frequency);
          
          // Configure oscillators
          oscL.type = 'sine';
          oscR.type = 'sine';
          harmonic2L.type = 'sine';
          harmonic2R.type = 'sine';
          oscL.frequency.value = leftFreq;
          oscR.frequency.value = rightFreq;
          
          const now = ctx.currentTime;
          const fadeTime = easing ? 0.08 : 0; // Even smoother fade for meditation
          
          // Set initial volume (lower for meditation)
          gainL.gain.setValueAtTime(0, now);
          gainR.gain.setValueAtTime(0, now);
          
          // Very smooth meditation-style fade
          if (fadeTime > 0) {
            gainL.gain.linearRampToValueAtTime(0.35, now + fadeTime); // Lower volume for meditation
            gainR.gain.linearRampToValueAtTime(0.35, now + fadeTime);
            gainL.gain.linearRampToValueAtTime(0.35, now + durationSec - fadeTime);
            gainR.gain.linearRampToValueAtTime(0.35, now + durationSec - fadeTime);
            gainL.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
            gainR.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
          } else {
            gainL.gain.setValueAtTime(0.35, now);
            gainR.gain.setValueAtTime(0.35, now);
            gainL.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
            gainR.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
          }
          
          // Start all oscillators
          oscL.start(now);
          oscR.start(now);
          harmonic2L.start(now);
          harmonic2R.start(now);
          tremoloOsc.start(now);
          vibratoOsc.start(now);
          
          // Schedule stops
          oscL.stop(now + durationSec);
          oscR.stop(now + durationSec);
          harmonic2L.stop(now + durationSec);
          harmonic2R.stop(now + durationSec);
          tremoloOsc.stop(now + durationSec);
          vibratoOsc.stop(now + durationSec);
          
          // Update state
          set({ isPlaying: true, currentFrequency: fHz });
          
          console.log('Tone started successfully:', fHz, 'Hz for', durationSec, 'seconds');
          
          // Clean up when finished
          return new Promise<void>((resolve) => {
            oscL.onended = () => {
              set({ isPlaying: false, currentFrequency: null });
              console.log('Meditation tone ended:', fHz, 'Hz');
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
