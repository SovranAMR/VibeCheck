'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioEngine } from '@/stores/audioEngine';
import { useSessionStore } from '@/stores/sessionStore';
import { FeelType, BodyLocusType, FreePick } from '@/types';

const MIN_FREQ = 40;
const MAX_FREQ = 8000;

export default function FreepickPage() {
  const router = useRouter();
  const { playTone, isUnlocked, ctx, master } = useAudioEngine();
  const { setFreepickData, setCurrentStep, completeStep } = useSessionStore();
  
  const [sliderValue, setSliderValue] = useState(0.5); // 0-1 range
  const [currentFreq, setCurrentFreq] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
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

  // Logarithmic frequency mapping: f = exp(ln(40) + v * ln(8000/40))
  const sliderToFreq = (value: number) => {
    const logMin = Math.log(MIN_FREQ);
    const logMax = Math.log(MAX_FREQ);
    return Math.round(Math.exp(logMin + value * (logMax - logMin)));
  };

  useEffect(() => {
    setCurrentStep('freq-freepick');
    if (!isUnlocked) {
      router.push('/start');
    }
  }, [isUnlocked, router, setCurrentStep]);

  useEffect(() => {
    const freq = sliderToFreq(sliderValue);
    setCurrentFreq(freq);
    
    // Update playing frequency in real-time
    if (isPlaying && oscRef.current) {
      oscRef.current.frequency.setValueAtTime(freq, ctx!.currentTime);
    }
  }, [sliderValue, isPlaying, ctx]);

  const startContinuousPlay = async () => {
    if (!ctx || !master || isPlaying) return;
    
    setIsPlaying(true);
    setListeningStartTime(Date.now());
    
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
      setIsPlaying(false);
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
    
    setIsPlaying(false);
  };

  const handleSelectFrequency = () => {
    const listeningTime = listeningStartTime ? Date.now() - listeningStartTime : 0;
    
    // Minimum 3 seconds listening time
    if (listeningTime < 3000) {
      alert('Biraz daha dinle. En az 3 saniye dinlemeden seçim yapamazsın.');
      return;
    }
    
    stopContinuousPlay();
    setSelectedFreq(currentFreq);
    setHasSelectedFreq(true);
  };

  const handleFeelSelect = (feel: FeelType) => {
    setExperienceData(prev => ({ ...prev, feel }));
  };

  const handleBodySelect = (body: BodyLocusType) => {
    setExperienceData(prev => ({
      ...prev,
      body: prev.body.includes(body)
        ? prev.body.filter(b => b !== body) // Remove if already selected
        : [...prev.body, body] // Add if not selected
    }));
  };

  const handleComplete = () => {
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

  const handleRestart = () => {
    setHasSelectedFreq(false);
    setSelectedFreq(null);
    setExperienceData({ feel: null, body: [] });
    setListeningStartTime(null);
  };

  // Serbest seçim hisleri (nötr dil)
  const feelOptions: { value: FeelType; label: string; emoji: string; preference: 'high' | 'medium' | 'low' }[] = [
    // Çok beğendim
    { value: 'bliss', label: 'Çok Rahatladım', emoji: '😊', preference: 'high' },
    { value: 'love', label: 'Sıcak Hissettim', emoji: '💛', preference: 'high' },
    { value: 'peace', label: 'Huzurlandım', emoji: '😌', preference: 'high' },
    { value: 'expansion', label: 'Ferahladım', emoji: '🌅', preference: 'high' },
    { value: 'clarity', label: 'Berraklaştım', emoji: '💎', preference: 'high' },
    { value: 'warmth', label: 'Isındım', emoji: '☀️', preference: 'high' },
    
    // Fena değil
    { value: 'energy', label: 'Enerji Geldi', emoji: '⚡', preference: 'medium' },
    { value: 'focused', label: 'Odaklandım', emoji: '🎯', preference: 'medium' },
    { value: 'grounded', label: 'Güçlü Hissettim', emoji: '🌱', preference: 'medium' },
    { value: 'curious', label: 'İlginç Buldum', emoji: '🤔', preference: 'medium' },
    
    // Pek beğenmedim
    { value: 'neutral', label: 'Hiçbir Şey', emoji: '😐', preference: 'low' },
    { value: 'restless', label: 'Huzursuzlandım', emoji: '😤', preference: 'low' },
    { value: 'tension', label: 'Gerildim', emoji: '😬', preference: 'low' },
    { value: 'confusion', label: 'Karıştım', emoji: '😕', preference: 'low' }
  ];

  // Vücut bölgeleri (nötr dil)
  const bodyOptions: { value: BodyLocusType; label: string; emoji: string; resonance: 'deep' | 'surface' | 'energy' | 'none' }[] = [
    // İçeride hissettim
    { value: 'heart', label: 'Kalbimin İçinde', emoji: '❤️', resonance: 'deep' },
    { value: 'belly', label: 'Karnımın İçinde', emoji: '🔥', resonance: 'deep' },
    { value: 'spine', label: 'Sırtımda', emoji: '🦴', resonance: 'deep' },
    { value: 'chest', label: 'Göğsümün İçinde', emoji: '🫁', resonance: 'deep' },
    
    // Yüzeyde hissettim
    { value: 'forehead', label: 'Alnımda', emoji: '🧠', resonance: 'surface' },
    { value: 'throat', label: 'Boğazımda', emoji: '🗣️', resonance: 'surface' },
    { value: 'hands', label: 'Ellerimde', emoji: '🤲', resonance: 'surface' },
    { value: 'feet', label: 'Ayaklarımda', emoji: '🦶', resonance: 'surface' },
    
    // Çevremde hissettim
    { value: 'crown', label: 'Kafamın Üstünde', emoji: '👑', resonance: 'energy' },
    { value: 'aura_field', label: 'Çevremde', emoji: '🌟', resonance: 'energy' },
    { value: 'full_body', label: 'Tüm Vücudumda', emoji: '✨', resonance: 'energy' },
    
    // Hiçbir yerde
    { value: 'no_sensation', label: 'Hiçbir Yerde', emoji: '❓', resonance: 'none' }
  ];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (oscRef.current) {
        oscRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-light text-white">
            Serbest Seçim
          </h1>
          
          <p className="text-lg text-slate-300">
            En huzurlu hissettiğin frekansı bul
          </p>
        </div>

        {!hasSelectedFreq ? (
          <>
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
                disabled={!isPlaying && listeningStartTime !== null}
              />
              
              <div className="flex justify-between text-xs text-slate-500">
                <span>{MIN_FREQ}Hz</span>
                <span>Bas ← → Tiz</span>
                <span>{MAX_FREQ}Hz</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="space-y-4">
              {!isPlaying ? (
                <button
                  onClick={startContinuousPlay}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
                >
                  Dinlemeye Başla
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="text-purple-400 text-lg">
                    🎵 Kaydırarak farklı frekansları dene
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={handleSelectFrequency}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105"
                    >
                      Bu Frekansı Seç
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
          </>
        ) : (
          <>
            {/* Selected Frequency */}
            <div className="space-y-4">
              <div className="text-2xl text-green-400">
                ✓ Seçilen Frekans: {selectedFreq} Hz
              </div>
              
              <button
                onClick={handleRestart}
                className="text-slate-400 hover:text-slate-300 text-sm underline"
              >
                Yeniden seç
              </button>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {/* Feel Question - Grouped by Preference */}
              <div className="space-y-4">
                <h3 className="text-lg text-white">Bu frekans sende nasıl bir etki yarattı?</h3>
                
                {/* Yüksek Tercih */}
                <div className="space-y-2">
                  <h4 className="text-xs text-green-400 font-medium uppercase tracking-wide">🌟 Çok Beğendim</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {feelOptions.filter(opt => opt.preference === 'high').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFeelSelect(option.value)}
                        className={`
                          p-2 rounded-lg transition-all duration-300 border-2 text-xs
                          ${experienceData.feel === option.value
                            ? 'border-green-500 bg-green-500/20 text-white scale-105'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-green-400 hover:bg-green-400/10'
                          }
                        `}
                      >
                        <div className="text-base mb-1">{option.emoji}</div>
                        <div className="font-medium leading-tight">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orta Tercih */}
                <div className="space-y-2">
                  <h4 className="text-xs text-blue-400 font-medium uppercase tracking-wide">⚖️ Fena Değil</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {feelOptions.filter(opt => opt.preference === 'medium').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFeelSelect(option.value)}
                        className={`
                          p-2 rounded-lg transition-all duration-300 border-2 text-xs
                          ${experienceData.feel === option.value
                            ? 'border-yellow-500 bg-yellow-500/20 text-white scale-105'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-yellow-400 hover:bg-yellow-400/10'
                          }
                        `}
                      >
                        <div className="text-base mb-1">{option.emoji}</div>
                        <div className="font-medium leading-tight">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Düşük Tercih */}
                <div className="space-y-2">
                  <h4 className="text-xs text-orange-400 font-medium uppercase tracking-wide">⚠️ Pek Beğenmedim</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {feelOptions.filter(opt => opt.preference === 'low').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFeelSelect(option.value)}
                        className={`
                          p-2 rounded-lg transition-all duration-300 border-2 text-xs
                          ${experienceData.feel === option.value
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
              </div>

              {/* Body Question - Grouped by Resonance Type */}
              {experienceData.feel && (
                <div className="space-y-4">
                  <h3 className="text-lg text-white">Nerede hissettin? <span className="text-sm text-slate-400">(Birden fazla seçebilirsin)</span></h3>
                  
                  {/* Derin Rezonans */}
                  <div className="space-y-2">
                    <h4 className="text-xs text-red-400 font-medium uppercase tracking-wide">❤️ İçeride Hissettim</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {bodyOptions.filter(opt => opt.resonance === 'deep').map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleBodySelect(option.value)}
                          className={`
                            p-3 rounded-lg transition-all duration-300 border-2 text-sm
                            ${experienceData.body.includes(option.value)
                              ? 'border-blue-500 bg-blue-500/20 text-white scale-105'
                              : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-blue-400 hover:bg-blue-400/10'
                            }
                          `}
                        >
                          <div className="text-lg mb-1">{option.emoji}</div>
                          <div className="font-medium">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Yüzey Rezonansı */}
                  <div className="space-y-2">
                    <h4 className="text-xs text-blue-400 font-medium uppercase tracking-wide">🤲 Yüzeyde Hissettim</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {bodyOptions.filter(opt => opt.resonance === 'surface').map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleBodySelect(option.value)}
                          className={`
                            p-3 rounded-lg transition-all duration-300 border-2 text-sm
                            ${experienceData.body.includes(option.value)
                              ? 'border-purple-500 bg-purple-500/20 text-white scale-105'
                              : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-purple-400 hover:bg-purple-400/10'
                            }
                          `}
                        >
                          <div className="text-lg mb-1">{option.emoji}</div>
                          <div className="font-medium">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Enerji Alanı */}
                  <div className="space-y-2">
                    <h4 className="text-xs text-yellow-400 font-medium uppercase tracking-wide">✨ Çevremde Hissettim</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {bodyOptions.filter(opt => opt.resonance === 'energy').map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleBodySelect(option.value)}
                          className={`
                            p-3 rounded-lg transition-all duration-300 border-2 text-sm
                            ${experienceData.body.includes(option.value)
                              ? 'border-cyan-500 bg-cyan-500/20 text-white scale-105'
                              : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-cyan-400 hover:bg-cyan-400/10'
                            }
                          `}
                        >
                          <div className="text-lg mb-1">{option.emoji}</div>
                          <div className="font-medium">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Etki Yok */}
                  <div className="space-y-2">
                    <h4 className="text-xs text-gray-400 font-medium uppercase tracking-wide">❓ Hiçbir Yerde</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {bodyOptions.filter(opt => opt.resonance === 'none').map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleBodySelect(option.value)}
                          className={`
                            p-3 rounded-lg transition-all duration-300 border-2 text-sm
                            ${experienceData.body.includes(option.value)
                              ? 'border-gray-500 bg-gray-500/20 text-white scale-105'
                              : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-gray-400 hover:bg-gray-400/10'
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
              )}

              {/* Complete Button */}
              {experienceData.feel && experienceData.body && (
                <button
                  onClick={handleComplete}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
                >
                  Zaman Testine Geç →
                </button>
              )}
            </div>
          </>
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
      </div>

      <style jsx>{`
        .freq-slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }
        
        .freq-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </div>
  );
}
