'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioEngine } from '@/stores/audioEngine';
import { useSessionStore } from '@/stores/sessionStore';
import { FeelType, BodyLocusType, FixedFreqItem } from '@/types';

const FIXED_FREQUENCIES = [40, 110, 220, 432, 528, 1000, 4000, 8000]; // Hz

export default function FreqMainPage() {
  const router = useRouter();
  const { playTone, isUnlocked, ctx, master } = useAudioEngine();
  const { addFixedFreqData, setCurrentStep, completeStep } = useSessionStore();
  
  const [currentFreqIndex, setCurrentFreqIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isContinuousPlaying, setIsContinuousPlaying] = useState(false);
  const [hasPlayedCurrent, setHasPlayedCurrent] = useState(false);
  const [currentData, setCurrentData] = useState<{
    valence: FeelType | null;
    like: number;
    locus: BodyLocusType[];
  }>({
    valence: null,
    like: 50, // Default slider value
    locus: []
  });

  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const currentFreq = FIXED_FREQUENCIES[currentFreqIndex];
  const isLastFreq = currentFreqIndex === FIXED_FREQUENCIES.length - 1;
  const progressPercent = Math.round(((currentFreqIndex + 1) / FIXED_FREQUENCIES.length) * 100);

  useEffect(() => {
    setCurrentStep('freq-main');
    if (!isUnlocked) {
      router.push('/start');
    }
  }, [isUnlocked, router, setCurrentStep]);

  const handlePlayFrequency = async () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    setHasPlayedCurrent(true);
    
    try {
      // 8-10 saniye oynat
      await playTone(currentFreq, 9);
    } catch (error) {
      console.error('Fixed freq tone failed:', error);
    } finally {
      setIsPlaying(false);
    }
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

  const startContinuousPlay = async () => {
    if (!ctx || !master || isContinuousPlaying) return;
    
    setIsContinuousPlaying(true);
    setHasPlayedCurrent(true);
    
    try {
      // Create oscillator and gain nodes
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(master);
      
      osc.type = 'sine';
      osc.frequency.value = currentFreq;
      
      // Fade in
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.05);
      
      osc.start();
      
      oscRef.current = osc;
      gainRef.current = gain;
      
    } catch (error) {
      console.error('Continuous play failed:', error);
      setIsContinuousPlaying(false);
    }
  };

  const stopContinuousPlay = () => {
    if (oscRef.current && gainRef.current && ctx) {
      // Fade out
      gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
      
      setTimeout(() => {
        if (oscRef.current) {
          oscRef.current.stop();
          oscRef.current = null;
          gainRef.current = null;
        }
      }, 60);
    }
    
    setIsContinuousPlaying(false);
  };

  const handleNext = () => {
    if (currentData.valence && currentData.locus.length > 0) {
      // Stop continuous play if running
      if (isContinuousPlaying) {
        stopContinuousPlay();
      }
      
      // Kaydet
      const fixedFreqData: FixedFreqItem = {
        f: currentFreq,
        valence: currentData.valence,
        like: currentData.like,
        locus: currentData.locus
      };
      
      addFixedFreqData(fixedFreqData);

      if (isLastFreq) {
        // Tüm frekanslar tamamlandı
        completeStep('freq-main');
        router.push('/freq/freepick');
      } else {
        // Sonraki frekansa geç
        setCurrentFreqIndex(prev => prev + 1);
        setCurrentData({ valence: null, like: 50, locus: [] });
        setHasPlayedCurrent(false);
      }
    }
  };

  const handleBack = () => {
    if (currentFreqIndex > 0) {
      // Stop continuous play if running
      if (isContinuousPlaying) {
        stopContinuousPlay();
      }
      
      setCurrentFreqIndex(prev => prev - 1);
      setCurrentData({ valence: null, like: 50, locus: [] });
      setHasPlayedCurrent(false);
    }
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
      <div className="max-w-5xl w-full text-center space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-light text-white">
            Frekans Profili
          </h1>
          
          <div className="space-y-1">
            <p className="text-xl text-purple-300 font-medium">
              {currentFreq} Hz
            </p>
            <p className="text-sm text-slate-400">
              {getFreqDescription(currentFreq)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="text-xs text-slate-500">
            {currentFreqIndex + 1} / {FIXED_FREQUENCIES.length} ({progressPercent}%)
          </div>
        </div>

        {/* Play Options */}
        <div className="space-y-4">
          {!hasPlayedCurrent && !isPlaying && !isContinuousPlaying && (
            <div className="space-y-4">
              <button
                onClick={handlePlayFrequency}
                className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg"
              >
                {currentFreq} Hz Dinle (9sn)
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
              🎵 Dinliyorsun... ({currentFreq} Hz - 9sn)
            </div>
          )}

          {isContinuousPlaying && (
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
        </div>

        {/* Questions - show after playing or while continuous playing */}
        {hasPlayedCurrent && (!isPlaying || isContinuousPlaying) && (
          <div className="space-y-6">
            {/* Question 1: Valence - Grouped by Intensity */}
            <div className="space-y-4">
              <h3 className="text-lg text-white">Bu frekans seni nasıl etkiledi?</h3>
              
              {/* Güçlü Etkiler */}
              <div className="space-y-2">
                <h4 className="text-xs text-green-400 font-medium uppercase tracking-wide">🌟 Güçlü Hisler</h4>
                <div className="grid grid-cols-4 gap-2">
                  {feelOptions.filter(opt => opt.intensity === 'high' && !['tension'].includes(opt.value)).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleValenceSelect(option.value)}
                      className={`
                        p-2 rounded-lg transition-all duration-300 border-2 text-xs
                        ${currentData.valence === option.value
                          ? 'border-red-500 bg-red-500/20 text-white scale-105'
                          : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-red-400 hover:bg-red-400/10'
                        }
                      `}
                    >
                      <div className="text-base mb-1">{option.emoji}</div>
                      <div className="font-medium leading-tight">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dengeli Etkiler */}
              <div className="space-y-2">
                <h4 className="text-xs text-blue-400 font-medium uppercase tracking-wide">⚖️ Orta Hisler</h4>
                <div className="grid grid-cols-4 gap-2">
                  {feelOptions.filter(opt => opt.intensity === 'medium').map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleValenceSelect(option.value)}
                      className={`
                        p-2 rounded-lg transition-all duration-300 border-2 text-xs
                        ${currentData.valence === option.value
                          ? 'border-blue-500 bg-blue-500/20 text-white scale-105'
                          : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-blue-400 hover:bg-blue-400/10'
                        }
                      `}
                    >
                      <div className="text-base mb-1">{option.emoji}</div>
                      <div className="font-medium leading-tight">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hafif/Olumsuz Etkiler */}
              <div className="space-y-2">
                <h4 className="text-xs text-orange-400 font-medium uppercase tracking-wide">⚠️ Zor Hisler</h4>
                <div className="grid grid-cols-4 gap-2">
                  {feelOptions.filter(opt => opt.intensity === 'low' || ['tension', 'confusion', 'heaviness', 'restless'].includes(opt.value)).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleValenceSelect(option.value)}
                      className={`
                        p-2 rounded-lg transition-all duration-300 border-2 text-xs
                        ${currentData.valence === option.value
                          ? 'border-gray-500 bg-gray-500/20 text-white scale-105'
                          : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-gray-400 hover:bg-gray-400/10'
                        }
                      `}
                    >
                      <div className="text-base mb-1">{option.emoji}</div>
                      <div className="font-medium leading-tight">{option.label}</div>
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
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={currentData.like}
                    onChange={(e) => handleLikeChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>1</span>
                    <span className="text-purple-400 font-medium">{currentData.like}</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            )}

            {/* Question 3: Body Locus - Grouped by System */}
            {currentData.valence && (
              <div className="space-y-4">
                <h3 className="text-lg text-white">Nerede hissettin? <span className="text-sm text-slate-400">(Birden fazla seçebilirsin)</span></h3>
                
                {/* Sinir Sistemi */}
                <div className="space-y-2">
                  <h4 className="text-xs text-purple-400 font-medium uppercase tracking-wide">🧠 Baş ve Boyun</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {bodyOptions.filter(opt => opt.system === 'ust').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleLocusSelect(option.value)}
                        className={`
                          p-3 rounded-lg transition-all duration-300 border-2 text-xs
                          ${currentData.locus.includes(option.value)
                            ? 'border-yellow-500 bg-yellow-500/20 text-white scale-105'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-yellow-400 hover:bg-yellow-400/10'
                          }
                        `}
                      >
                        <div className="text-lg mb-1">{option.emoji}</div>
                        <div className="font-medium leading-tight">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Çakra Sistemi */}
                <div className="space-y-2">
                  <h4 className="text-xs text-pink-400 font-medium uppercase tracking-wide">❤️ Göğüs ve Kollar</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {bodyOptions.filter(opt => opt.system === 'orta').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleLocusSelect(option.value)}
                        className={`
                          p-3 rounded-lg transition-all duration-300 border-2 text-xs
                          ${currentData.locus.includes(option.value)
                            ? 'border-purple-500 bg-purple-500/20 text-white scale-105'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-purple-400 hover:bg-purple-400/10'
                          }
                        `}
                      >
                        <div className="text-lg mb-1">{option.emoji}</div>
                        <div className="font-medium leading-tight">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Organ Sistemi */}
                <div className="space-y-2">
                  <h4 className="text-xs text-orange-400 font-medium uppercase tracking-wide">🔥 Karın ve Bacaklar</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {bodyOptions.filter(opt => opt.system === 'alt').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleLocusSelect(option.value)}
                        className={`
                          p-3 rounded-lg transition-all duration-300 border-2 text-xs
                          ${currentData.locus.includes(option.value)
                            ? 'border-green-500 bg-green-500/20 text-white scale-105'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-green-400 hover:bg-green-400/10'
                          }
                        `}
                      >
                        <div className="text-lg mb-1">{option.emoji}</div>
                        <div className="font-medium leading-tight">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enerji Alanları */}
                <div className="space-y-2">
                  <h4 className="text-xs text-yellow-400 font-medium uppercase tracking-wide">✨ Genel Alanlar</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {bodyOptions.filter(opt => opt.system === 'genel').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleLocusSelect(option.value)}
                        className={`
                          p-4 rounded-lg transition-all duration-300 border-2
                          ${currentData.locus.includes(option.value)
                            ? 'border-cyan-500 bg-cyan-500/20 text-white scale-105'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-cyan-400 hover:bg-cyan-400/10'
                          }
                        `}
                      >
                        <div className="text-2xl mb-2">{option.emoji}</div>
                        <div className="font-medium text-sm">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {currentData.valence && currentData.locus && (
              <div className="flex justify-center space-x-4 pt-4">
                {currentFreqIndex > 0 && (
                  <button
                    onClick={handleBack}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300"
                  >
                    ← Geri
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
                >
                  {isLastFreq ? 'Serbest Seçime Geç →' : 'Sonraki Frekans →'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Frequency List Preview */}
        <div className="pt-6">
          <div className="flex flex-wrap justify-center gap-2">
            {FIXED_FREQUENCIES.map((freq, index) => (
              <div
                key={freq}
                className={`
                  px-2 py-1 rounded text-xs
                  ${index < currentFreqIndex 
                    ? 'bg-green-600/20 text-green-400' 
                    : index === currentFreqIndex 
                    ? 'bg-purple-600/20 text-purple-400' 
                    : 'bg-slate-700/20 text-slate-500'
                  }
                `}
              >
                {freq}Hz
              </div>
            ))}
          </div>
        </div>
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
