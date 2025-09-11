'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioEngine } from '@/stores/audioEngine';
import { useSessionStore } from '@/stores/sessionStore';
import { FeelType, BodyLocusType } from '@/types';

const PREFEEL_FREQUENCIES = [528, 220, 40]; // Hz

export default function PrefeelPage() {
  const router = useRouter();
  const { playTone, isUnlocked, ctx, master } = useAudioEngine();
  const { addPrefeelData, setCurrentStep, completeStep } = useSessionStore();
  
  const [currentFreqIndex, setCurrentFreqIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isContinuousPlaying, setIsContinuousPlaying] = useState(false);
  const [hasPlayedCurrent, setHasPlayedCurrent] = useState(false);
  const [currentData, setCurrentData] = useState<{
    feel: FeelType | null;
    body: BodyLocusType[];
  }>({
    feel: null,
    body: []
  });

  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const currentFreq = PREFEEL_FREQUENCIES[currentFreqIndex];
  const isLastFreq = currentFreqIndex === PREFEEL_FREQUENCIES.length - 1;

  useEffect(() => {
    setCurrentStep('prefeel');
    if (!isUnlocked) {
      router.push('/start');
    }
  }, [isUnlocked, router, setCurrentStep]);

  const handlePlayFrequency = async () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    setHasPlayedCurrent(true);
    
    try {
      await playTone(currentFreq, 5); // 5 saniye
    } catch (error) {
      console.error('Prefeel tone failed:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleFeelSelect = (feel: FeelType) => {
    setCurrentData(prev => ({ ...prev, feel }));
  };

  const handleBodySelect = (body: BodyLocusType) => {
    setCurrentData(prev => ({
      ...prev,
      body: prev.body.includes(body)
        ? prev.body.filter(b => b !== body) // Remove if already selected
        : [...prev.body, body] // Add if not selected
    }));
  };

  const startContinuousPlay = async () => {
    if (!ctx || !master || isContinuousPlaying) return;
    
    setIsContinuousPlaying(true);
    setHasPlayedCurrent(true);
    
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(master);
      
      osc.type = 'sine';
      osc.frequency.value = currentFreq;
      
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
    if (currentData.feel && currentData.body.length > 0) {
      if (isContinuousPlaying) {
        stopContinuousPlay();
      }
      
      // Kaydet
      addPrefeelData({
        f: currentFreq,
        feel: currentData.feel,
        body: currentData.body
      });

      if (isLastFreq) {
        // Tüm frekanslar tamamlandı
        completeStep('prefeel');
        router.push('/freq/main');
      } else {
        // Sonraki frekansa geç
        setCurrentFreqIndex(prev => prev + 1);
        setCurrentData({ feel: null, body: [] });
        setHasPlayedCurrent(false);
      }
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

  const feelOptions: { value: FeelType; label: string; emoji: string; category: string }[] = [
    // Pozitif hisler
    { value: 'joy', label: 'Keyifli', emoji: '😊', category: 'pozitif' },
    { value: 'peace', label: 'Huzurlu', emoji: '😌', category: 'pozitif' },
    { value: 'energy', label: 'Enerjik', emoji: '⚡', category: 'pozitif' },
    { value: 'love', label: 'Sıcak', emoji: '💛', category: 'pozitif' },
    { value: 'clarity', label: 'Berrak', emoji: '💎', category: 'pozitif' },
    { value: 'warmth', label: 'Rahat', emoji: '☀️', category: 'pozitif' },
    
    // Nötr hisler
    { value: 'neutral', label: 'Normal', emoji: '😐', category: 'notr' },
    { value: 'curious', label: 'Meraklı', emoji: '🤔', category: 'notr' },
    { value: 'focused', label: 'Odaklanmış', emoji: '🎯', category: 'notr' },
    { value: 'grounded', label: 'Sakin', emoji: '🌱', category: 'notr' },
    
    // Negatif hisler
    { value: 'tension', label: 'Gergin', emoji: '😬', category: 'negatif' },
    { value: 'anxiety', label: 'Endişeli', emoji: '😰', category: 'negatif' },
    { value: 'confusion', label: 'Karışık', emoji: '😕', category: 'negatif' },
    { value: 'restless', label: 'Huzursuz', emoji: '😤', category: 'negatif' },
    { value: 'empty', label: 'Boş', emoji: '😶', category: 'negatif' }
  ];

  const bodyOptions: { value: BodyLocusType; label: string; emoji: string; category: string }[] = [
    // Üst bölge
    { value: 'crown', label: 'Kafamın Tepesi', emoji: '👑', category: 'ust' },
    { value: 'forehead', label: 'Alnım', emoji: '🧠', category: 'ust' },
    { value: 'eyes', label: 'Gözlerim', emoji: '👀', category: 'ust' },
    { value: 'ears', label: 'Kulaklarım', emoji: '👂', category: 'ust' },
    { value: 'throat', label: 'Boğazım', emoji: '🗣️', category: 'ust' },
    
    // Orta bölge
    { value: 'heart', label: 'Kalbim', emoji: '❤️', category: 'orta' },
    { value: 'chest', label: 'Göğsüm', emoji: '🫁', category: 'orta' },
    { value: 'solar_plexus', label: 'Midem', emoji: '☀️', category: 'orta' },
    { value: 'arms', label: 'Kollarım', emoji: '💪', category: 'orta' },
    { value: 'hands', label: 'Ellerim', emoji: '🤲', category: 'orta' },
    
    // Alt bölge
    { value: 'belly', label: 'Karnım', emoji: '🔥', category: 'alt' },
    { value: 'sacral', label: 'Kasık Bölgem', emoji: '🧡', category: 'alt' },
    { value: 'legs', label: 'Bacaklarım', emoji: '🦵', category: 'alt' },
    { value: 'feet', label: 'Ayaklarım', emoji: '🦶', category: 'alt' },
    
    // Genel
    { value: 'full_body', label: 'Tüm Vücudum', emoji: '✨', category: 'genel' },
    { value: 'aura_field', label: 'Çevremde', emoji: '🌟', category: 'genel' },
    { value: 'no_sensation', label: 'Hiçbir Yerde', emoji: '❓', category: 'genel' }
  ];

  const getFreqDescription = (freq: number) => {
    switch (freq) {
      case 528: return 'Sevgi Frekansı';
      case 220: return 'Derin Rezonans';
      case 40: return 'Temel Titreşim';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-8">
      <div className="max-w-5xl text-center space-y-8">
        {/* Başlık */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-light text-white">
            İlk Deneyim
          </h1>
          
          <div className="space-y-2">
            <p className="text-lg text-slate-300">
              {currentFreq} Hz - {getFreqDescription(currentFreq)}
            </p>
            <p className="text-sm text-slate-400">
              {currentFreqIndex + 1} / {PREFEEL_FREQUENCIES.length}
            </p>
          </div>
        </div>

        {/* Play Options */}
        <div className="space-y-6">
          {!hasPlayedCurrent && !isPlaying && !isContinuousPlaying && (
            <div className="space-y-4">
              <button
                onClick={handlePlayFrequency}
                className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-4 rounded-full text-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/25"
              >
                {currentFreq} Hz Dinle (5sn)
              </button>
              
              <div className="text-slate-400 text-sm">veya</div>
              
              <button
                onClick={startContinuousPlay}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
              >
                🔄 Sürekli Dinle (Cevaplarken)
              </button>
            </div>
          )}

          {/* Playing States */}
          {isPlaying && (
            <div className="text-purple-400 text-lg">
              🎵 Dinliyorsun... ({currentFreq} Hz - 5sn)
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
          <div className="space-y-8">
            {/* Feel Question */}
            <div className="space-y-6">
              <h3 className="text-xl text-white">Ne hissettin?</h3>
              
              {/* Pozitif Hisler */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-green-400 flex items-center gap-2">
                  <span>🌟</span> İyi Hisler
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {feelOptions.filter(option => option.category === 'pozitif').map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFeelSelect(option.value)}
                      className={`
                        p-3 rounded-lg transition-all duration-300 border-2 text-sm
                        ${currentData.feel === option.value
                          ? 'border-green-500 bg-green-500/20 text-white'
                          : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-green-500/50'
                        }
                      `}
                    >
                      <div className="text-lg mb-1">{option.emoji}</div>
                      <div className="font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nötr Hisler */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
                  <span>⚖️</span> Normal Hisler
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {feelOptions.filter(option => option.category === 'notr').map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFeelSelect(option.value)}
                      className={`
                        p-3 rounded-lg transition-all duration-300 border-2 text-sm
                        ${currentData.feel === option.value
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-blue-500/50'
                        }
                      `}
                    >
                      <div className="text-lg mb-1">{option.emoji}</div>
                      <div className="font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Negatif Hisler */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-orange-400 flex items-center gap-2">
                  <span>⚠️</span> Zor Hisler
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {feelOptions.filter(option => option.category === 'negatif').map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFeelSelect(option.value)}
                      className={`
                        p-3 rounded-lg transition-all duration-300 border-2 text-sm
                        ${currentData.feel === option.value
                          ? 'border-orange-500 bg-orange-500/20 text-white'
                          : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-orange-500/50'
                        }
                      `}
                    >
                      <div className="text-lg mb-1">{option.emoji}</div>
                      <div className="font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Body Question */}
            {currentData.feel && (
              <div className="space-y-6">
                <h3 className="text-xl text-white">Nerede hissettin? <span className="text-sm text-slate-400">(Birden fazla seçebilirsin)</span></h3>
                
                {/* Üst Bölge */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2">
                    <span>🧠</span> Baş ve Boyun
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {bodyOptions.filter(option => option.category === 'ust').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleBodySelect(option.value)}
                        className={`
                          p-2 rounded-lg transition-all duration-300 border-2 text-xs
                          ${currentData.body.includes(option.value)
                            ? 'border-purple-500 bg-purple-500/20 text-white'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-purple-500/50'
                          }
                        `}
                      >
                        <div className="text-sm mb-1">{option.emoji}</div>
                        <div className="font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orta Bölge */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-pink-400 flex items-center gap-2">
                    <span>❤️</span> Göğüs ve Kollar
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {bodyOptions.filter(option => option.category === 'orta').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleBodySelect(option.value)}
                        className={`
                          p-2 rounded-lg transition-all duration-300 border-2 text-xs
                          ${currentData.body.includes(option.value)
                            ? 'border-pink-500 bg-pink-500/20 text-white'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-pink-500/50'
                          }
                        `}
                      >
                        <div className="text-sm mb-1">{option.emoji}</div>
                        <div className="font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alt Bölge */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-orange-400 flex items-center gap-2">
                    <span>🔥</span> Karın ve Bacaklar
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {bodyOptions.filter(option => option.category === 'alt').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleBodySelect(option.value)}
                        className={`
                          p-2 rounded-lg transition-all duration-300 border-2 text-xs
                          ${currentData.body.includes(option.value)
                            ? 'border-orange-500 bg-orange-500/20 text-white'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-orange-500/50'
                          }
                        `}
                      >
                        <div className="text-sm mb-1">{option.emoji}</div>
                        <div className="font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Genel */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                    <span>✨</span> Genel Alanlar
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {bodyOptions.filter(option => option.category === 'genel').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleBodySelect(option.value)}
                        className={`
                          p-2 rounded-lg transition-all duration-300 border-2 text-xs
                          ${currentData.body.includes(option.value)
                            ? 'border-yellow-500 bg-yellow-500/20 text-white'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-yellow-500/50'
                          }
                        `}
                      >
                        <div className="text-sm mb-1">{option.emoji}</div>
                        <div className="font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Next Button */}
            {currentData.feel && currentData.body && (
              <button
                onClick={handleNext}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
              >
                {isLastFreq ? 'Ana Teste Geç' : 'Sonraki Frekans'}
              </button>
            )}
          </div>
        )}

        {/* Progress Indicator */}
        <div className="pt-8">
          <div className="flex items-center justify-center space-x-1 mb-4">
            {PREFEEL_FREQUENCIES.map((_, index) => (
              <div key={index} className="flex items-center">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${index < currentFreqIndex 
                    ? 'bg-green-600 text-white' 
                    : index === currentFreqIndex 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-700 text-slate-400'
                  }
                `}>
                  {index < currentFreqIndex ? '✓' : index + 1}
                </div>
                {index < PREFEEL_FREQUENCIES.length - 1 && (
                  <div className="w-8 h-0.5 bg-slate-700 mx-1"></div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-xs text-slate-500">
            İlk Deneyim - Spontan Tepkiler
          </div>
        </div>
      </div>
    </div>
  );
}
