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
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = ctx.createGain();
      master.connect(ctx.destination);
      master.gain.value = 0.3; // Default volume
      
      set({ ctx, master });
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
    
    if (!ctx || !master || !isUnlocked) {
      console.warn('Audio engine not ready');
      return;
    }

    return new Promise<void>((resolve) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Setup audio graph
      osc.connect(gain);
      gain.connect(master);
      
      // Configure oscillator
      osc.type = shape;
      osc.frequency.value = fHz;
      
      const now = ctx.currentTime;
      const fadeTime = easing ? 0.01 : 0; // 10ms fade to prevent clicks
      
      // Fade in
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.7, now + fadeTime);
      
      // Fade out
      gain.gain.linearRampToValueAtTime(0.7, now + durationSec - fadeTime);
      gain.gain.linearRampToValueAtTime(0, now + durationSec);
      
      // Start and schedule stop
      osc.start(now);
      osc.stop(now + durationSec);
      
      // Update state
      set({ isPlaying: true, currentFrequency: fHz });
      
      // Clean up when finished
      osc.onended = () => {
        set({ isPlaying: false, currentFrequency: null });
        resolve();
      };
    });
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
