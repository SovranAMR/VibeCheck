import { create } from 'zustand';
import { AudioEngine } from '@/types';

interface AudioEngineStore extends AudioEngine {
  // State
  isPlaying: boolean;
  currentFrequency: number | null;
  
  // Actions
  init: () => Promise<void>;
  playTone: (frequency: number, duration: number, shape?: OscillatorType) => Promise<void>;
  stopTone: () => void;
}

export const useAudioEngine = create<AudioEngineStore>((set, get) => ({
  // Initial state
  ctx: null,
  master: null,
  isUnlocked: false,
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
      master.connect(ctx.destination);
      master.gain.value = 0.5; // Higher volume for mobile
      
      set({ ctx, master });
      
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
      // Create main oscillator and gain
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Create tremolo (amplitude modulation) for natural feel
      const tremoloOsc = ctx.createOscillator();
      const tremoloGain = ctx.createGain();
      
      // Setup tremolo (subtle amplitude modulation)
      tremoloOsc.type = 'sine';
      tremoloOsc.frequency.value = 4.5; // 4.5 Hz tremolo (natural vibrato rate)
      tremoloGain.gain.value = 0.15; // Subtle tremolo depth (15%)
      
      // Connect tremolo
      tremoloOsc.connect(tremoloGain);
      tremoloGain.connect(gain.gain); // Modulate the main gain
      
      // Setup main audio graph
      osc.connect(gain);
      gain.connect(master);
      
      // Configure main oscillator - use sine for more natural sound
      osc.type = 'sine'; // Always sine for natural feel
      osc.frequency.value = fHz;
      
      // Add subtle frequency modulation (vibrato) for even more natural feel
      const vibratoOsc = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibratoOsc.type = 'sine';
      vibratoOsc.frequency.value = 5.2; // 5.2 Hz vibrato
      vibratoGain.gain.value = fHz * 0.003; // Very subtle frequency modulation (0.3%)
      
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(osc.frequency); // Modulate main frequency
      
      const now = ctx.currentTime;
      const fadeTime = easing ? 0.05 : 0; // Longer, smoother fade
      
      // Set initial volume
      gain.gain.setValueAtTime(0, now);
      
      // Smooth fade in/out with exponential curves for more natural feel
      if (fadeTime > 0) {
        gain.gain.linearRampToValueAtTime(0.6, now + fadeTime); // Slightly lower volume
        gain.gain.linearRampToValueAtTime(0.6, now + durationSec - fadeTime);
        gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec); // Smooth exponential fade out
      } else {
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
      }
      
      // Start all oscillators
      osc.start(now);
      tremoloOsc.start(now);
      vibratoOsc.start(now);
      
      // Schedule stops
      osc.stop(now + durationSec);
      tremoloOsc.stop(now + durationSec);
      vibratoOsc.stop(now + durationSec);
      
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
}));
