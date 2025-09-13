'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioEngine } from '@/stores/audioEngine';
import { useSessionStore } from '@/stores/sessionStore';
import { FeelType, BodyLocusType } from '@/types';
import AudioVisualizer from '@/components/AudioVisualizer';

export default function CalibrationPage() {
  const router = useRouter();
  const { playTone, setMasterVolume, isUnlocked, ctx, master } = useAudioEngine();
  const { addPrefeelData, setCurrentStep, completeStep } = useSessionStore();
  
  const [currentPhase, setCurrentPhase] = useState<'volume' | 'experience'>('volume');
  const [volume, setVolume] = useState(0.3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isContinuousPlaying, setIsContinuousPlaying] = useState(false);
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
    setCurrentStep('calibration');
    if (!isUnlocked) {
      router.push('/start');
    }
  }, [isUnlocked, router, setCurrentStep]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setMasterVolume(newVolume);
  };

  const handlePlayCalibrationTone = async () => {
    if (isPlaying) return;
    
    console.log('Calibration tone button clicked');
    setIsPlaying(true);
    
    try {
      // iOS specific: Force context resume
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
        console.log('Audio context resumed for calibration');
      }
      
      console.log('Playing calibration tone: 1000Hz, 3 seconds');
      await playTone(1000, 3); // 1kHz, 3 saniye
      console.log('Calibration tone completed');
    } catch (error) {
      console.error('Calibration tone failed:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleStartExperience = async () => {
    setCurrentPhase('experience');
    setIsPlaying(true);
    
    try {
      // iOS specific: Force context resume
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
        console.log('Audio context resumed for experience');
      }
      
      console.log('Playing experience tone: 432Hz, 5 seconds');
      await playTone(432, 5); // 432Hz, 5 saniye
      console.log('Experience tone completed');
    } catch (error) {
      console.error('Experience tone failed:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const startContinuousPlay = async () => {
    if (!ctx || !master || isContinuousPlaying) return;
    
    setIsContinuousPlaying(true);
    
    try {
      // Create main oscillator and gain
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Create tremolo for natural feel
      const tremoloOsc = ctx.createOscillator();
      const tremoloGain = ctx.createGain();
      
      // Setup tremolo
      tremoloOsc.type = 'sine';
      tremoloOsc.frequency.value = 4.0; // 4 Hz tremolo for 432Hz
      tremoloGain.gain.value = 0.1; // Gentle tremolo for calibration
      
      // Create vibrato
      const vibratoOsc = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibratoOsc.type = 'sine';
      vibratoOsc.frequency.value = 5.5; // 5.5 Hz vibrato
      vibratoGain.gain.value = 432 * 0.0015; // Very subtle for 432Hz
      
      // Connect audio graph
      osc.connect(gain);
      gain.connect(master);
      
      // Connect modulation
      tremoloOsc.connect(tremoloGain);
      tremoloGain.connect(gain.gain);
      
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      osc.type = 'sine';
      osc.frequency.value = 432;
      
      // Smooth fade in
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.1);
      
      // Start all oscillators
      osc.start();
      tremoloOsc.start();
      vibratoOsc.start();
      
      oscRef.current = osc;
      gainRef.current = gain;
      
      // Store for cleanup
      (osc as any).tremoloOsc = tremoloOsc;
      (osc as any).vibratoOsc = vibratoOsc;
      
    } catch (error) {
      console.error('Continuous play failed:', error);
      setIsContinuousPlaying(false);
    }
  };

  const stopContinuousPlay = () => {
    if (oscRef.current && gainRef.current && ctx) {
      // Smooth fade out
      gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      
      setTimeout(() => {
        if (oscRef.current) {
          // Stop modulation oscillators
          const tremoloOsc = (oscRef.current as any).tremoloOsc;
          const vibratoOsc = (oscRef.current as any).vibratoOsc;
          
          if (tremoloOsc) tremoloOsc.stop();
          if (vibratoOsc) vibratoOsc.stop();
          
          oscRef.current.stop();
          oscRef.current = null;
          gainRef.current = null;
        }
      }, 120);
    }
    
    setIsContinuousPlaying(false);
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
    if (experienceData.feel && experienceData.body.length > 0) {
      // Stop continuous play if running
      if (isContinuousPlaying) {
        stopContinuousPlay();
      }
      
      // Kaydet
      addPrefeelData({
        f: 432,
        feel: experienceData.feel,
        body: experienceData.body
      });
      
      completeStep('calibration');
      router.push('/prefeel');
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
    // Pozitif hisler (nötr dil)
    { value: 'bliss', label: 'Çok İyi', emoji: '😊', category: 'pozitif' },
    { value: 'joy', label: 'Keyifli', emoji: '😄', category: 'pozitif' },
    { value: 'peace', label: 'Huzurlu', emoji: '😌', category: 'pozitif' },
    { value: 'love', label: 'Sıcak', emoji: '💛', category: 'pozitif' },
    { value: 'energy', label: 'Enerjik', emoji: '⚡', category: 'pozitif' },
    { value: 'clarity', label: 'Berrak', emoji: '💎', category: 'pozitif' },
    { value: 'warmth', label: 'Rahat', emoji: '☀️', category: 'pozitif' },
    { value: 'expansion', label: 'Ferah', emoji: '🌅', category: 'pozitif' },
    
    // Nötr durumlar
    { value: 'neutral', label: 'Normal', emoji: '😐', category: 'nötr' },
    { value: 'curious', label: 'Meraklı', emoji: '🤔', category: 'nötr' },
    { value: 'focused', label: 'Odaklanmış', emoji: '🎯', category: 'nötr' },
    { value: 'grounded', label: 'Sakin', emoji: '🌱', category: 'nötr' },
    
    // Zorlayıcı hisler (nötr dil)
    { value: 'tension', label: 'Gergin', emoji: '😬', category: 'negatif' },
    { value: 'anxiety', label: 'Endişeli', emoji: '😰', category: 'negatif' },
    { value: 'sadness', label: 'Üzgün', emoji: '😢', category: 'negatif' },
    { value: 'anger', label: 'Sinirli', emoji: '😠', category: 'negatif' },
    { value: 'confusion', label: 'Karışık', emoji: '😕', category: 'negatif' },
    { value: 'heaviness', label: 'Ağır', emoji: '😴', category: 'negatif' },
    { value: 'restless', label: 'Huzursuz', emoji: '😤', category: 'negatif' },
    { value: 'empty', label: 'Boş', emoji: '😶', category: 'negatif' }
  ];

  const bodyOptions: { value: BodyLocusType; label: string; emoji: string; category: string }[] = [
    // Üst bölge (nötr dil)
    { value: 'crown', label: 'Kafamın Tepesi', emoji: '👑', category: 'üst' },
    { value: 'forehead', label: 'Alnım', emoji: '🧠', category: 'üst' },
    { value: 'eyes', label: 'Gözlerim', emoji: '👀', category: 'üst' },
    { value: 'ears', label: 'Kulaklarım', emoji: '👂', category: 'üst' },
    { value: 'throat', label: 'Boğazım', emoji: '🗣️', category: 'üst' },
    
    // Orta bölge (nötr dil)
    { value: 'heart', label: 'Kalbim', emoji: '❤️', category: 'orta' },
    { value: 'chest', label: 'Göğsüm', emoji: '🫁', category: 'orta' },
    { value: 'solar_plexus', label: 'Midem', emoji: '☀️', category: 'orta' },
    { value: 'arms', label: 'Kollarım', emoji: '💪', category: 'orta' },
    { value: 'hands', label: 'Ellerim', emoji: '🤲', category: 'orta' },
    
    // Alt bölge (nötr dil)
    { value: 'belly', label: 'Karnım', emoji: '🔥', category: 'alt' },
    { value: 'sacral', label: 'Kasık Bölgem', emoji: '🧡', category: 'alt' },
    { value: 'legs', label: 'Bacaklarım', emoji: '🦵', category: 'alt' },
    { value: 'feet', label: 'Ayaklarım', emoji: '🦶', category: 'alt' },
    { value: 'spine', label: 'Sırtım', emoji: '🦴', category: 'alt' },
    
    // Genel (nötr dil)
    { value: 'full_body', label: 'Tüm Vücudum', emoji: '✨', category: 'genel' },
    { value: 'aura_field', label: 'Çevremde', emoji: '🌟', category: 'genel' },
    { value: 'no_sensation', label: 'Hiçbir Yerde', emoji: '❓', category: 'genel' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl text-center space-y-8 w-full">
        {/* Başlık */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-light text-white">
            Kalibrasyon
          </h1>
          
          {currentPhase === 'volume' ? (
            <p className="text-lg text-slate-300">
              Ses seviyeni konforlu bir noktaya getir.
            </p>
          ) : (
            <p className="text-lg text-slate-300">
              432 Hz frekansta 5 saniye dinle ve hislerini paylaş.
            </p>
          )}
        </div>

        {/* Volume Phase */}
        {currentPhase === 'volume' && (
          <div className="space-y-8">
            {/* Volume Slider */}
            <div className="space-y-4">
              <div className="text-slate-400">Ses Seviyesi</div>
              <div className="px-8">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="text-sm text-slate-500 mt-2">
                  {Math.round(volume * 100)}%
                </div>
              </div>
            </div>

            {/* Audio Visualizer */}
            <div className="flex justify-center items-center h-32">
              <AudioVisualizer isPlaying={isPlaying || isContinuousPlaying} />
            </div>

            {/* Test Button */}
            <button
              onClick={handlePlayCalibrationTone}
              disabled={isPlaying}
              className={`
                px-8 py-3 rounded-full text-lg font-medium transition-all duration-300
                ${isPlaying 
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105'
                }
              `}
            >
              {isPlaying ? 'Çalıyor...' : 'Test Sesi (1kHz - 3sn)'}
            </button>

            {/* Continue Button */}
            <button
              onClick={handleStartExperience}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
            >
              İlk Deneyime Geç
            </button>
          </div>
        )}

        {/* Experience Phase */}
        {currentPhase === 'experience' && (
          <div className="space-y-8">
            {/* Audio Visualizer */}
            <div className="flex justify-center items-center h-32">
              <AudioVisualizer isPlaying={isPlaying || isContinuousPlaying} />
            </div>

            {/* Play Options */}
            {!isPlaying && !isContinuousPlaying && experienceData.feel === null && (
              <div className="space-y-4">
                <button
                  onClick={handleStartExperience}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
                >
                  432 Hz Dinle (5sn)
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
              <div className="text-purple-400 text-xl">
                🎵 Dinliyorsun... (432 Hz - 5sn)
              </div>
            )}

            {isContinuousPlaying && (
              <div className="space-y-3">
                <div className="text-green-400 text-lg">
                  🔄 Sürekli dinliyorsun... (432 Hz)
                </div>
                <button
                  onClick={stopContinuousPlay}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
                >
                  Durdur
                </button>
              </div>
            )}

            {/* Questions */}
            {(!isPlaying || isContinuousPlaying) && (
              <div className="space-y-8">
                {/* Feel Question */}
                <div className="space-y-6">
                  <h3 className="text-xl text-white">Ne hissettin?</h3>
                  
                  {/* Pozitif duygular */}
                  <div className="space-y-3">
                    <h4 className="text-sm text-green-400 font-medium">🌟 İyi Hisler</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {feelOptions.filter(opt => opt.category === 'pozitif').map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleFeelSelect(option.value)}
                          className={`
                            p-3 rounded-lg transition-all duration-300 border-2 text-sm
                            ${experienceData.feel === option.value
                              ? 'border-green-500 bg-green-500/20 text-white scale-105'
                              : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-green-400 hover:bg-green-400/10'
                            }
                          `}
                        >
                          <div className="text-lg mb-1">{option.emoji}</div>
                          <div className="font-medium text-xs">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nötr durumlar */}
                  <div className="space-y-3">
                    <h4 className="text-sm text-blue-400 font-medium">⚖️ Normal Hisler</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {feelOptions.filter(opt => opt.category === 'nötr').map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleFeelSelect(option.value)}
                          className={`
                            p-3 rounded-lg transition-all duration-300 border-2 text-sm
                            ${experienceData.feel === option.value
                              ? 'border-blue-500 bg-blue-500/20 text-white scale-105'
                              : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-blue-400 hover:bg-blue-400/10'
                            }
                          `}
                        >
                          <div className="text-lg mb-1">{option.emoji}</div>
                          <div className="font-medium text-xs">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Negatif duygular */}
                  <div className="space-y-3">
                    <h4 className="text-sm text-orange-400 font-medium">⚠️ Zor Hisler</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {feelOptions.filter(opt => opt.category === 'negatif').map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleFeelSelect(option.value)}
                          className={`
                            p-3 rounded-lg transition-all duration-300 border-2 text-sm
                            ${experienceData.feel === option.value
                              ? 'border-red-500 bg-red-500/20 text-white scale-105'
                              : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-red-400 hover:bg-red-400/10'
                            }
                          `}
                        >
                          <div className="text-lg mb-1">{option.emoji}</div>
                          <div className="font-medium text-xs">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Body Question */}
                {experienceData.feel && (
                  <div className="space-y-6">
                    <h3 className="text-xl text-white">Nerede hissettin? <span className="text-sm text-slate-400">(Birden fazla seçebilirsin)</span></h3>
                    
                    {/* Üst bölgeler */}
                    <div className="space-y-3">
                      <h4 className="text-sm text-purple-400 font-medium">🧠 Baş ve Boyun</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {bodyOptions.filter(opt => opt.category === 'üst').map((option) => (
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
                            <div className="font-medium text-xs leading-tight">{option.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Orta bölgeler */}
                    <div className="space-y-3">
                      <h4 className="text-sm text-pink-400 font-medium">❤️ Göğüs ve Kollar</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {bodyOptions.filter(opt => opt.category === 'orta').map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleBodySelect(option.value)}
                            className={`
                              p-3 rounded-lg transition-all duration-300 border-2 text-sm
                              ${experienceData.body.includes(option.value)
                                ? 'border-green-500 bg-green-500/20 text-white scale-105'
                                : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-green-400 hover:bg-green-400/10'
                              }
                            `}
                          >
                            <div className="text-lg mb-1">{option.emoji}</div>
                            <div className="font-medium text-xs leading-tight">{option.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Alt bölgeler */}
                    <div className="space-y-3">
                      <h4 className="text-sm text-orange-400 font-medium">🔥 Karın ve Bacaklar</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {bodyOptions.filter(opt => opt.category === 'alt').map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleBodySelect(option.value)}
                            className={`
                              p-3 rounded-lg transition-all duration-300 border-2 text-sm
                              ${experienceData.body.includes(option.value)
                                ? 'border-orange-500 bg-orange-500/20 text-white scale-105'
                                : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-orange-400 hover:bg-orange-400/10'
                              }
                            `}
                          >
                            <div className="text-lg mb-1">{option.emoji}</div>
                            <div className="font-medium text-xs leading-tight">{option.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Genel bölgeler */}
                    <div className="space-y-3">
                      <h4 className="text-sm text-yellow-400 font-medium">✨ Genel Alanlar</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {bodyOptions.filter(opt => opt.category === 'genel').map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleBodySelect(option.value)}
                            className={`
                              p-4 rounded-lg transition-all duration-300 border-2
                              ${experienceData.body.includes(option.value)
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

                {/* Complete Button */}
                {experienceData.feel && experienceData.body && (
                  <button
                    onClick={handleComplete}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
                  >
                    Devam Et
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="pt-8">
          <div className="flex items-center justify-center space-x-2 text-slate-500">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">
              1
            </div>
            <div className="w-12 h-0.5 bg-slate-700"></div>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
              2
            </div>
            <div className="w-12 h-0.5 bg-slate-700"></div>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">
              3
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Hazırlık → Kalibrasyon → Test
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
