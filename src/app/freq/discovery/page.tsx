'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioEngine } from '@/stores/audioEngine';
import { useSessionStore } from '@/stores/sessionStore';
// import { FREQUENCY_QUESTIONS } from '@/lib/questions'; // Bu satır kaldırılıyor
import { FixedFreqItem, FeelType, BodyLocusType, FreePick } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import AudioVisualizer from '@/components/AudioVisualizer';

const FREQUENCY_QUESTIONS = [
  { f: 40, description: 'Temel Titreşim' },
  { f: 110, description: 'Derin Bas' },
  { f: 220, description: 'Düşük Rezonans' },
  { f: 432, description: 'Doğal Uyum' },
  { f: 528, description: 'Sevgi Frekansı' },
  { f: 1000, description: 'Referans Tonu' },
  { f: 4000, description: 'Berraklık' },
  { f: 8000, description: 'Yüksek Enerji' },
];

const MIN_FREQ = 40;
const MAX_FREQ = 8000;

export default function FrequencyDiscoveryPage() {
  const router = useRouter();
  const { playTone: playShortTone, isUnlocked, ctx, master } = useAudioEngine();
  const {
    addFixedFreqData,
    setFreepickData,
    session,
    setCurrentStep,
    completeStep,
  } = useSessionStore();

  const [mode, setMode] = useState<'main' | 'freepick'>('main');
  const [mainTestFrequencies, setMainTestFrequencies] = useState<number[]>([]);

  // States for 'main' mode
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentData, setCurrentData] = useState<{
    valence: FeelType | null;
    like: number;
    locus: BodyLocusType[];
  }>({
    valence: null,
    like: 50, // Default slider value
    locus: []
  });
  const [showQuestions, setShowQuestions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // States for 'freepick' mode, copied from FreepickPage
  const [sliderValue, setSliderValue] = useState(0.5); // 0-1 range
  const [currentFreq, setCurrentFreq] = useState(0);
  const [isFreepickPlaying, setIsFreepickPlaying] = useState(false);
  const [listeningStartTime, setListeningStartTime] = useState<number | null>(null);
  const [hasSelectedFreq, setHasSelectedFreq] = useState(false);
  const [selectedFreq, setSelectedFreq] = useState<number | null>(null);
  const [experienceData, setExperienceData] = useState<{
    feel: FeelType | null;
    body: BodyLocusType[];
  }>({
    feel: null,
    body: []
  });

  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);


  useEffect(() => {
    setCurrentStep('freq-main'); // Initial step
    if (!isUnlocked) {
      router.push('/start');
    }
    const playedFrequencies = session.fixed?.map(item => item.f) || [];
    setMainTestFrequencies(playedFrequencies);
  }, [isUnlocked, router, setCurrentStep, session.fixed]);

  // Logarithmic frequency mapping for freepick slider
  const sliderToFreq = (value: number) => {
    const logMin = Math.log(MIN_FREQ);
    const logMax = Math.log(MAX_FREQ);
    return Math.round(Math.exp(logMin + value * (logMax - logMin)));
  };

  const handlePlayFrequency = async () => {
    if (currentIndex >= FREQUENCY_QUESTIONS.length) return;
    setIsPlaying(true);
    await playShortTone(FREQUENCY_QUESTIONS[currentIndex].f, 1.5, 'sine');
    setIsPlaying(false);
    setShowQuestions(true);
  };

  const handleValenceSelect = (valence: FeelType) => {
    setCurrentData(prev => ({ ...prev, valence }));
  };

  const handleLikeChange = (like: number) => {
    setCurrentData(prev => ({ ...prev, like }));
  };

  const handleLocusSelect = (locus: BodyLocusType) => {
    setCurrentData(prev => ({
      ...prev,
      locus: prev.locus.includes(locus)
        ? prev.locus.filter(l => l !== locus) // Remove if already selected
        : [...prev.locus, locus] // Add if not selected
    }));
  };

  const handleNext = () => {
    if (currentData.valence && currentData.locus.length > 0) {
      // Stop continuous play if running
      if (isFreepickPlaying) {
        stopContinuousPlay();
      }
      
      // Kaydet
      const fixedFreqData: FixedFreqItem = {
        f: FREQUENCY_QUESTIONS[currentIndex].f,
        valence: currentData.valence,
        like: currentData.like,
        locus: currentData.locus
      };
      
      addFixedFreqData(fixedFreqData);

      const newIndex = currentIndex + 1;
      if (newIndex < FREQUENCY_QUESTIONS.length) {
        setCurrentIndex(newIndex);
        setShowQuestions(false);
        handlePlayFrequency(); // Automatically play next frequency
      } else {
        completeStep('freq-main');
        setMode('freepick'); // Switch to freepick mode
        setCurrentStep('freq-freepick');
      }
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      // Stop continuous play if running
      if (isFreepickPlaying) {
        stopContinuousPlay();
      }
      
      setCurrentIndex(prev => prev - 1);
      setCurrentData({ valence: null, like: 50, locus: [] });
      setShowQuestions(false);
    }
  };

  // --- Functions for Freepick Mode (copied and adapted) ---

  useEffect(() => {
    if (mode !== 'freepick') return;

    const freq = sliderToFreq(sliderValue);
    setCurrentFreq(freq);
    
    // Don't update playing frequency in real-time to avoid sound changes
    // User needs to stop and restart to hear new frequency
  }, [sliderValue, mode]);


  const startContinuousPlay = async () => {
    if (!ctx || !master || isFreepickPlaying) return;
    
    // iOS specific: Force context resume
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        console.log('Audio context resumed for iOS');
      } catch (error) {
        console.error('Failed to resume audio context:', error);
      }
    }
    
    setIsFreepickPlaying(true);
    setListeningStartTime(Date.now());
    
    try {
      // Create main oscillator with smooth, breathable sound (same as audio engine)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Create low-pass filter for high frequencies to reduce harshness
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = Math.min(8000, currentFreq * 8); // Dynamic cutoff based on frequency
      filter.Q.value = 0.5; // Gentle rolloff
      
      // Create subtle harmonics only for lower frequencies
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
      osc.frequency.value = currentFreq;
      
      // Setup harmonics with frequency-dependent levels (softer for high frequencies)
      const freqFactor = Math.max(0.1, 1 - (currentFreq - 200) / 1000); // Softer harmonics for higher frequencies
      
      harmonic2.type = 'sine';
      harmonic2.frequency.value = currentFreq * 2; // Octave
      harmonic2Gain.gain.value = 0.015 * freqFactor; // Much softer for high frequencies
      
      harmonic3.type = 'sine';
      harmonic3.frequency.value = currentFreq * 1.5; // Perfect fifth
      harmonic3Gain.gain.value = 0.008 * freqFactor; // Much softer for high frequencies
      
      // Setup tremolo (very slow, calm breathing-like modulation)
      tremoloOsc.type = 'sine';
      tremoloOsc.frequency.value = 0.3; // Very slow, calm breathing (18 breaths per minute)
      tremoloGain.gain.value = 0.08; // More noticeable for gentle breathing effect
      
      // Setup vibrato (very gentle pitch variation)
      vibratoOsc.type = 'sine';
      vibratoOsc.frequency.value = 2.8; // Slower, more natural
      vibratoGain.gain.value = currentFreq * 0.0003; // Much gentler, especially for high frequencies
      
      // Setup chorus (very subtle detuning for smoothness)
      chorusOsc.type = 'sine';
      chorusOsc.frequency.value = 0.3; // Very slow for smoothness
      chorusGain.gain.value = currentFreq * 0.00005; // Ultra subtle, especially for high frequencies
      
      // Connect audio graph with filter for smoothness
      osc.connect(gain);
      harmonic2.connect(harmonic2Gain);
      harmonic3.connect(harmonic3Gain);
      harmonic2Gain.connect(gain);
      harmonic3Gain.connect(gain);
      gain.connect(filter); // Apply filter for smoothness
      filter.connect(master);
      
      // Connect modulation
      tremoloOsc.connect(tremoloGain);
      tremoloGain.connect(gain.gain);
      
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      // Connect chorus effect
      chorusOsc.connect(chorusGain);
      chorusGain.connect(osc.frequency);
      
      // Smooth fade in for meditation
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.1); // Lower volume for meditation
      
      // Start all oscillators
      osc.start();
      harmonic2.start();
      harmonic3.start();
      tremoloOsc.start();
      vibratoOsc.start();
      chorusOsc.start();
      
      oscRef.current = osc; // Store main osc
      gainRef.current = gain; // Store main gain
      
      // Store all for cleanup
      (osc as any).harmonic2 = harmonic2;
      (osc as any).harmonic3 = harmonic3;
      (osc as any).tremoloOsc = tremoloOsc;
      (osc as any).vibratoOsc = vibratoOsc;
      (osc as any).chorusOsc = chorusOsc;
      
    } catch (error) {
      console.error('Continuous play failed:', error);
      setIsFreepickPlaying(false);
    }
  };

  const stopContinuousPlay = () => {
    if (oscRef.current && gainRef.current && ctx) {
      // Smooth fade out
      gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      
      setTimeout(() => {
        if (oscRef.current) {
          // Stop modulation oscillators
          const harmonic2 = (oscRef.current as any).harmonic2;
          const harmonic3 = (oscRef.current as any).harmonic3;
          const tremoloOsc = (oscRef.current as any).tremoloOsc;
          const vibratoOsc = (oscRef.current as any).vibratoOsc;
          const chorusOsc = (oscRef.current as any).chorusOsc;
          
          if (harmonic2) harmonic2.stop();
          if (harmonic3) harmonic3.stop();
          if (tremoloOsc) tremoloOsc.stop();
          if (vibratoOsc) vibratoOsc.stop();
          if (chorusOsc) chorusOsc.stop();
          
          oscRef.current.stop();
          oscRef.current = null;
          gainRef.current = null;
        }
      }, 120);
    }
    
    setIsFreepickPlaying(false);
  };

  const handleSelectFrequency = () => {
    const listeningTime = listeningStartTime ? Date.now() - listeningStartTime : 0;
    
    // Minimum 3 seconds listening time
    if (listeningTime < 3000) {
      alert('Biraz daha dinle. En az 3 saniye dinlemeden seçim yapamazsın.');
      return;
    }
    
    stopContinuousPlay();
    
    const freepickData: FreePick = {
      f: currentFreq,
    };
    
    setFreepickData(freepickData);
    completeStep('freq-freepick');
    router.push('/chrono');
  };

  const handleFeelSelectFreepick = (feel: FeelType) => {
    setExperienceData(prev => ({ ...prev, feel }));
  };

  const handleBodySelectFreepick = (body: BodyLocusType) => {
    setExperienceData(prev => ({
      ...prev,
      body: prev.body.includes(body)
        ? prev.body.filter(b => b !== body) // Remove if already selected
        : [...prev.body, body] // Add if not selected
    }));
  };

  const handleCompleteFreepick = () => {
    if (selectedFreq && experienceData.feel && experienceData.body.length > 0) {
      const freepickData: FreePick = {
        f: selectedFreq,
        feel: experienceData.feel,
        body: experienceData.body
      };
      
      setFreepickData(freepickData);
      completeStep('freq-freepick');
      router.push('/chrono');
    }
  };

  const handleRestartFreepick = () => {
    setHasSelectedFreq(false);
    setSelectedFreq(null);
    setExperienceData({ feel: null, body: [] });
    setListeningStartTime(null);
  };

   // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (oscRef.current) {
        oscRef.current.stop();
      }
    };
  }, []);

  // Frekans etkisi hisleri (nötr dil)
  const feelOptions: { value: FeelType; label: string; emoji: string; intensity: 'low' | 'medium' | 'high' }[] = [
    // Güçlü etkiler
    { value: 'bliss', label: 'Çok İyi Hissettim', emoji: '😊', intensity: 'high' },
    { value: 'energy', label: 'Enerji Doldum', emoji: '⚡', intensity: 'high' },
    { value: 'expansion', label: 'Ferahladım', emoji: '🌅', intensity: 'high' },
    { value: 'clarity', label: 'Netleştim', emoji: '💎', intensity: 'high' },
    
    // Orta etkiler
    { value: 'warmth', label: 'Isındım', emoji: '☀️', intensity: 'medium' },
    { value: 'peace', label: 'Sakinleştim', emoji: '😌', intensity: 'medium' },
    { value: 'focused', label: 'Odaklandım', emoji: '🎯', intensity: 'medium' },
    { value: 'grounded', label: 'Rahatlladım', emoji: '🌱', intensity: 'medium' },
    
    // Hafif etkiler
    { value: 'neutral', label: 'Hiçbir Şey', emoji: '😐', intensity: 'low' },
    { value: 'curious', label: 'İlginç Geldi', emoji: '🤔', intensity: 'low' },
    
    // Olumsuz etkiler
    { value: 'tension', label: 'Gerildim', emoji: '😬', intensity: 'high' },
    { value: 'confusion', label: 'Karıştım', emoji: '😕', intensity: 'medium' },
    { value: 'heaviness', label: 'Ağırlaştım', emoji: '😴', intensity: 'medium' },
    { value: 'restless', label: 'Huzursuzlandım', emoji: '😤', intensity: 'low' }
  ];

  // Vücut bölgeleri (nötr dil)
  const bodyOptions: { value: BodyLocusType; label: string; emoji: string; system: 'ust' | 'orta' | 'alt' | 'genel' }[] = [
    // Üst bölge
    { value: 'forehead', label: 'Alnım', emoji: '🧠', system: 'ust' },
    { value: 'ears', label: 'Kulaklarım', emoji: '👂', system: 'ust' },
    { value: 'crown', label: 'Kafamın Tepesi', emoji: '👑', system: 'ust' },
    { value: 'throat', label: 'Boğazım', emoji: '🗣️', system: 'ust' },
    
    // Orta bölge
    { value: 'heart', label: 'Kalbim', emoji: '❤️', system: 'orta' },
    { value: 'chest', label: 'Göğsüm', emoji: '🫁', system: 'orta' },
    { value: 'solar_plexus', label: 'Midem', emoji: '☀️', system: 'orta' },
    { value: 'hands', label: 'Ellerim', emoji: '🤲', system: 'orta' },
    
    // Alt bölge
    { value: 'belly', label: 'Karnım', emoji: '🔥', system: 'alt' },
    { value: 'sacral', label: 'Kasık Bölgem', emoji: '🧡', system: 'alt' },
    { value: 'spine', label: 'Sırtım', emoji: '🦴', system: 'alt' },
    { value: 'feet', label: 'Ayaklarım', emoji: '🦶', system: 'alt' },
    
    // Genel
    { value: 'full_body', label: 'Tüm Vücudum', emoji: '✨', system: 'genel' },
    { value: 'aura_field', label: 'Çevremde', emoji: '🌟', system: 'genel' },
    { value: 'no_sensation', label: 'Hiçbir Yerde', emoji: '❓', system: 'genel' }
  ];

  const getFreqDescription = (freq: number) => {
    switch (freq) {
      case 40: return 'Temel Titreşim';
      case 110: return 'Derin Bas';
      case 220: return 'Düşük Rezonans';
      case 432: return 'Doğal Uyum';
      case 528: return 'Sevgi Frekansı';
      case 1000: return 'Referans Tonu';
      case 4000: return 'Berraklık';
      case 8000: return 'Yüksek Enerji';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-light text-white">
            {mode === 'main' ? 'Frekans Dizilimi' : 'Serbest Keşif'}
          </h1>
          <p className="text-lg text-slate-300">
            {mode === 'main' 
              ? 'Sıradaki frekansı dinle ve sende yarattığı etkiyi değerlendir. (Birden fazla vücut bölgesi seçebilirsin)' 
              : 'En huzurlu hissettiğin frekansı bul'}
          </p>
        </div>

        {/* Audio Visualizer */}
        <div className="flex justify-center items-center h-24">
          <AudioVisualizer isPlaying={isPlaying || isFreepickPlaying} />
        </div>

        <AnimatePresence mode="wait">
          {mode === 'main' ? (
            <motion.div
              key="main-mode"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {currentIndex < FREQUENCY_QUESTIONS.length ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h2 className="text-2xl text-white font-medium">
                      {FREQUENCY_QUESTIONS[currentIndex].f} Hz
                    </h2>
                    <p className="text-lg text-slate-300">
                      {getFreqDescription(FREQUENCY_QUESTIONS[currentIndex].f)}
                    </p>
                  </div>

                  {/* Play Options */}
                  {!isPlaying && !isFreepickPlaying && (
                    <div className="space-y-4">
                      <button
                        onClick={handlePlayFrequency}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        {FREQUENCY_QUESTIONS[currentIndex].f} Hz Dinle (1.5sn)
                      </button>
                      
                      <div className="text-slate-400 text-sm">veya</div>
                      
                      <button
                        onClick={startContinuousPlay}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
                      >
                        🔄 Sürekli Dinle (Cevaplarken)
                      </button>
                    </div>
                  )}

                  {/* Playing States */}
                  {isPlaying && (
                    <div className="text-purple-400 text-lg">
                      🎵 Dinliyorsun... ({FREQUENCY_QUESTIONS[currentIndex].f} Hz - 1.5sn)
                    </div>
                  )}

                  {isFreepickPlaying && (
                    <div className="space-y-3">
                      <div className="text-green-400 text-lg">
                        🔄 Sürekli dinliyorsun... ({currentFreq} Hz)
                      </div>
                      <button
                        onClick={stopContinuousPlay}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
                      >
                        Durdur
                      </button>
                    </div>
                  )}

                  {/* Questions - show after playing or while continuous playing */}
                  {showQuestions && (
                    <div className="space-y-6">
                      {/* Question 1: Valence */}
                      <div className="space-y-4">
                        <h3 className="text-lg text-white">Bu frekans seni nasıl etkiledi?</h3>
                        <div className="space-y-2">
                          <h4 className="text-xs text-green-400 font-medium uppercase tracking-wide">🌟 Güçlü Hisler</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {feelOptions.filter(opt => opt.intensity === 'high' && !['tension'].includes(opt.value)).map((option) => (
                              <button key={option.value} onClick={() => handleValenceSelect(option.value)} className={`p-2 rounded-lg transition-all duration-300 border-2 text-xs ${currentData.valence === option.value ? 'border-red-500 bg-red-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-red-400 hover:bg-red-400/10'}`}>
                                <div className="text-base mb-1">{option.emoji}</div><div className="font-medium leading-tight">{option.label}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs text-blue-400 font-medium uppercase tracking-wide">⚖️ Orta Hisler</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {feelOptions.filter(opt => opt.intensity === 'medium').map((option) => (
                              <button key={option.value} onClick={() => handleValenceSelect(option.value)} className={`p-2 rounded-lg transition-all duration-300 border-2 text-xs ${currentData.valence === option.value ? 'border-blue-500 bg-blue-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-blue-400 hover:bg-blue-400/10'}`}>
                                <div className="text-base mb-1">{option.emoji}</div><div className="font-medium leading-tight">{option.label}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs text-orange-400 font-medium uppercase tracking-wide">⚠️ Zor Hisler</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {feelOptions.filter(opt => opt.intensity === 'low' || ['tension', 'confusion', 'heaviness', 'restless'].includes(opt.value)).map((option) => (
                              <button key={option.value} onClick={() => handleValenceSelect(option.value)} className={`p-2 rounded-lg transition-all duration-300 border-2 text-xs ${currentData.valence === option.value ? 'border-gray-500 bg-gray-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-gray-400 hover:bg-gray-400/10'}`}>
                                <div className="text-base mb-1">{option.emoji}</div><div className="font-medium leading-tight">{option.label}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Question 2: Like Scale */}
                      {currentData.valence && (
                        <div className="space-y-3">
                          <h3 className="text-lg text-white">Hoşlanma derecen? (1-100)</h3>
                          <div className="px-6">
                            <input type="range" min="1" max="100" step="1" value={currentData.like} onChange={(e) => handleLikeChange(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"/>
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                              <span>1</span><span className="text-purple-400 font-medium">{currentData.like}</span><span>100</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Question 3: Body Locus */}
                      {currentData.valence && (
                        <div className="space-y-4">
                          <h3 className="text-lg text-white">Nerede hissettin? <span className="text-sm text-slate-400">(Birden fazla seçebilirsin)</span></h3>
                          <div className="space-y-2">
                            <h4 className="text-xs text-purple-400 font-medium uppercase tracking-wide">🧠 Baş ve Boyun</h4>
                            <div className="grid grid-cols-4 gap-2">
                              {bodyOptions.filter(opt => opt.system === 'ust').map((option) => (
                                <button key={option.value} onClick={() => handleLocusSelect(option.value)} className={`p-3 rounded-lg transition-all duration-300 border-2 text-xs ${currentData.locus.includes(option.value) ? 'border-yellow-500 bg-yellow-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-yellow-400 hover:bg-yellow-400/10'}`}>
                                  <div className="text-lg mb-1">{option.emoji}</div><div className="font-medium leading-tight">{option.label}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xs text-pink-400 font-medium uppercase tracking-wide">❤️ Göğüs ve Kollar</h4>
                            <div className="grid grid-cols-4 gap-2">
                              {bodyOptions.filter(opt => opt.system === 'orta').map((option) => (
                                <button key={option.value} onClick={() => handleLocusSelect(option.value)} className={`p-3 rounded-lg transition-all duration-300 border-2 text-xs ${currentData.locus.includes(option.value) ? 'border-purple-500 bg-purple-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-purple-400 hover:bg-purple-400/10'}`}>
                                  <div className="text-lg mb-1">{option.emoji}</div><div className="font-medium leading-tight">{option.label}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xs text-orange-400 font-medium uppercase tracking-wide">🔥 Karın ve Bacaklar</h4>
                            <div className="grid grid-cols-4 gap-2">
                              {bodyOptions.filter(opt => opt.system === 'alt').map((option) => (
                                <button key={option.value} onClick={() => handleLocusSelect(option.value)} className={`p-3 rounded-lg transition-all duration-300 border-2 text-xs ${currentData.locus.includes(option.value) ? 'border-green-500 bg-green-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-green-400 hover:bg-green-400/10'}`}>
                                  <div className="text-lg mb-1">{option.emoji}</div><div className="font-medium leading-tight">{option.label}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xs text-yellow-400 font-medium uppercase tracking-wide">✨ Genel Alanlar</h4>
                            <div className="grid grid-cols-3 gap-3">
                              {bodyOptions.filter(opt => opt.system === 'genel').map((option) => (
                                <button key={option.value} onClick={() => handleLocusSelect(option.value)} className={`p-4 rounded-lg transition-all duration-300 border-2 ${currentData.locus.includes(option.value) ? 'border-cyan-500 bg-cyan-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-cyan-400 hover:bg-cyan-400/10'}`}>
                                  <div className="text-2xl mb-2">{option.emoji}</div><div className="font-medium text-sm">{option.label}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Navigation Buttons */}
                      {currentData.valence && currentData.locus.length > 0 && (
                        <div className="flex justify-center space-x-4 pt-4">
                          {currentIndex > 0 && (
                            <button onClick={handleBack} className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300">
                              ← Geri
                            </button>
                          )}
                          <button onClick={handleNext} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105">
                            {currentIndex === FREQUENCY_QUESTIONS.length - 1 ? 'Serbest Seçime Geç →' : 'Sonraki Frekans →'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>Tamamlandı</div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="freepick-mode"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Frequency Display */}
              <div className="space-y-2">
                <div className="text-3xl font-light text-purple-300">
                  {currentFreq} Hz
                </div>
                <div className="text-sm text-slate-400">
                  Kaydır ve dinle
                </div>
              </div>

              {/* Logarithmic Slider */}
              <div className="space-y-4 px-6">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={sliderValue}
                  onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                  className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer freq-slider"
                  disabled={!isFreepickPlaying && listeningStartTime !== null}
                />
                
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{MIN_FREQ}Hz</span>
                  <span>Bas ← → Tiz</span>
                  <span>{MAX_FREQ}Hz</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="space-y-4">
                {!isFreepickPlaying ? (
                  <button
                    onClick={startContinuousPlay}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
                  >
                    Dinlemeye Başla
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="text-purple-400 text-lg">
                      🎵 Kaydırarak sana en uygun frekansı bul
                    </div>
                    
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={handleSelectFrequency}
                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
                      >
                        Bu Frekansı Seç ve Devam Et →
                      </button>
                      
                      <button
                        onClick={stopContinuousPlay}
                        className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300"
                      >
                        Durdur
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Listening Time Indicator */}
              {listeningStartTime && (
                <div className="text-xs text-slate-500">
                  Dinleme süresi: {Math.max(0, Math.round((Date.now() - listeningStartTime) / 1000))}s
                  {(Date.now() - listeningStartTime) < 3000 && ' (min 3s gerekli)'}
                </div>
              )}

              {/* Frequency Range Indicators */}
              <div className="pt-6">
                <div className="flex justify-between text-xs text-slate-600">
                  <div>40-100Hz<br/>Derin Bass</div>
                  <div>100-500Hz<br/>Temel</div>
                  <div>500-2kHz<br/>Orta</div>
                  <div>2k-8kHz<br/>Tiz</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}

// Separate components for freepick options to keep the main component cleaner
const FreepickFeelOptions = ({ onSelect, selectedValue }: { onSelect: (feel: FeelType) => void, selectedValue: FeelType | null }) => {
  const feelOptions: { value: FeelType; label: string; emoji: string; preference: 'high' | 'medium' | 'low' }[] = [
    { value: 'bliss', label: 'Çok Rahatladım', emoji: '😊', preference: 'high' }, { value: 'love', label: 'Sıcak Hissettim', emoji: '💛', preference: 'high' }, { value: 'peace', label: 'Huzurlandım', emoji: '😌', preference: 'high' }, { value: 'expansion', label: 'Ferahladım', emoji: '🌅', preference: 'high' }, { value: 'clarity', label: 'Berraklaştım', emoji: '💎', preference: 'high' }, { value: 'warmth', label: 'Isındım', emoji: '☀️', preference: 'high' },
    { value: 'energy', label: 'Enerji Geldi', emoji: '⚡', preference: 'medium' }, { value: 'focused', label: 'Odaklandım', emoji: '🎯', preference: 'medium' }, { value: 'grounded', label: 'Güçlü Hissettim', emoji: '🌱', preference: 'medium' }, { value: 'curious', label: 'İlginç Buldum', emoji: '🤔', preference: 'medium' },
    { value: 'neutral', label: 'Hiçbir Şey', emoji: '😐', preference: 'low' }, { value: 'restless', label: 'Huzursuzlandım', emoji: '😤', preference: 'low' }, { value: 'tension', label: 'Gerildim', emoji: '😬', preference: 'low' }, { value: 'confusion', label: 'Karıştım', emoji: '😕', preference: 'low' }
  ];

  return (
    <>
      <div className="space-y-2">
        <h4 className="text-xs text-green-400 font-medium uppercase tracking-wide">🌟 Çok Beğendim</h4>
        <div className="grid grid-cols-3 gap-2">
          {feelOptions.filter(opt => opt.preference === 'high').map((option) => (
            <button key={option.value} onClick={() => onSelect(option.value)} className={`p-2 rounded-lg transition-all duration-300 border-2 text-xs ${selectedValue === option.value ? 'border-green-500 bg-green-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-green-400 hover:bg-green-400/10'}`}>
              <div className="text-base mb-1">{option.emoji}</div><div className="font-medium leading-tight">{option.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs text-blue-400 font-medium uppercase tracking-wide">⚖️ Fena Değil</h4>
        <div className="grid grid-cols-4 gap-2">
          {feelOptions.filter(opt => opt.preference === 'medium').map((option) => (
            <button key={option.value} onClick={() => onSelect(option.value)} className={`p-2 rounded-lg transition-all duration-300 border-2 text-xs ${selectedValue === option.value ? 'border-yellow-500 bg-yellow-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-yellow-400 hover:bg-yellow-400/10'}`}>
              <div className="text-base mb-1">{option.emoji}</div><div className="font-medium leading-tight">{option.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs text-orange-400 font-medium uppercase tracking-wide">⚠️ Pek Beğenmedim</h4>
        <div className="grid grid-cols-4 gap-2">
          {feelOptions.filter(opt => opt.preference === 'low').map((option) => (
            <button key={option.value} onClick={() => onSelect(option.value)} className={`p-2 rounded-lg transition-all duration-300 border-2 text-xs ${selectedValue === option.value ? 'border-red-500 bg-red-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-red-400 hover:bg-red-400/10'}`}>
              <div className="text-base mb-1">{option.emoji}</div><div className="font-medium leading-tight">{option.label}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

const FreepickBodyOptions = ({ onSelect, selectedValues }: { onSelect: (body: BodyLocusType) => void, selectedValues: BodyLocusType[] }) => {
  const bodyOptions: { value: BodyLocusType; label: string; emoji: string; resonance: 'deep' | 'surface' | 'energy' | 'none' }[] = [
    { value: 'heart', label: 'Kalbimin İçinde', emoji: '❤️', resonance: 'deep' }, { value: 'belly', label: 'Karnımın İçinde', emoji: '🔥', resonance: 'deep' }, { value: 'spine', label: 'Sırtımda', emoji: '🦴', resonance: 'deep' }, { value: 'chest', label: 'Göğsümün İçinde', emoji: '🫁', resonance: 'deep' },
    { value: 'forehead', label: 'Alnımda', emoji: '🧠', resonance: 'surface' }, { value: 'throat', label: 'Boğazımda', emoji: '🗣️', resonance: 'surface' }, { value: 'hands', label: 'Ellerimde', emoji: '🤲', resonance: 'surface' }, { value: 'feet', label: 'Ayaklarımda', emoji: '🦶', resonance: 'surface' },
    { value: 'crown', label: 'Kafamın Üstünde', emoji: '👑', resonance: 'energy' }, { value: 'aura_field', label: 'Çevremde', emoji: '🌟', resonance: 'energy' }, { value: 'full_body', label: 'Tüm Vücudumda', emoji: '✨', resonance: 'energy' },
    { value: 'no_sensation', label: 'Hiçbir Yerde', emoji: '❓', resonance: 'none' }
  ];

  return (
    <>
      <div className="space-y-2">
        <h4 className="text-xs text-red-400 font-medium uppercase tracking-wide">❤️ İçeride Hissettim</h4>
        <div className="grid grid-cols-2 gap-2">
          {bodyOptions.filter(opt => opt.resonance === 'deep').map((option) => (
            <button key={option.value} onClick={() => onSelect(option.value)} className={`p-3 rounded-lg transition-all duration-300 border-2 text-sm ${selectedValues.includes(option.value) ? 'border-blue-500 bg-blue-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-blue-400 hover:bg-blue-400/10'}`}>
              <div className="text-lg mb-1">{option.emoji}</div><div className="font-medium">{option.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs text-blue-400 font-medium uppercase tracking-wide">🤲 Yüzeyde Hissettim</h4>
        <div className="grid grid-cols-2 gap-2">
          {bodyOptions.filter(opt => opt.resonance === 'surface').map((option) => (
            <button key={option.value} onClick={() => onSelect(option.value)} className={`p-3 rounded-lg transition-all duration-300 border-2 text-sm ${selectedValues.includes(option.value) ? 'border-purple-500 bg-purple-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-purple-400 hover:bg-purple-400/10'}`}>
              <div className="text-lg mb-1">{option.emoji}</div><div className="font-medium">{option.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs text-yellow-400 font-medium uppercase tracking-wide">✨ Çevremde Hissettim</h4>
        <div className="grid grid-cols-3 gap-2">
          {bodyOptions.filter(opt => opt.resonance === 'energy').map((option) => (
            <button key={option.value} onClick={() => onSelect(option.value)} className={`p-3 rounded-lg transition-all duration-300 border-2 text-sm ${selectedValues.includes(option.value) ? 'border-cyan-500 bg-cyan-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-cyan-400 hover:bg-cyan-400/10'}`}>
              <div className="text-lg mb-1">{option.emoji}</div><div className="font-medium">{option.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs text-gray-400 font-medium uppercase tracking-wide">❓ Hiçbir Yerde</h4>
        <div className="grid grid-cols-1 gap-2">
          {bodyOptions.filter(opt => opt.resonance === 'none').map((option) => (
            <button key={option.value} onClick={() => onSelect(option.value)} className={`p-3 rounded-lg transition-all duration-300 border-2 text-sm ${selectedValues.includes(option.value) ? 'border-gray-500 bg-gray-500/20 text-white scale-105' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-gray-400 hover:bg-gray-400/10'}`}>
              <div className="text-lg mb-1">{option.emoji}</div><div className="font-medium">{option.label}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
