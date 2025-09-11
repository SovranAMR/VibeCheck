'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/sessionStore';
import { ToneData } from '@/types';

const TOTAL_PAIRS = 8;
const TIME_LIMIT = 3500; // 3.5 seconds
const F1_RT_MS = 170; // Anchor: ~F1 tepki süresi civarı, 100 puan buradan başlar

interface TonePair {
  id: number;
  left: {
    label: string;
    emoji: string;
    vector: [number, number, number]; // [energy, saturation, texture]
  };
  right: {
    label: string;
    emoji: string;
    vector: [number, number, number];
  };
}

const TONE_PAIRS: TonePair[] = [
  {
    id: 1,
    left: { label: 'Sıcak', emoji: '🔥', vector: [1, 0, 0] },
    right: { label: 'Soğuk', emoji: '❄️', vector: [-1, 0, 0] }
  },
  {
    id: 2,
    left: { label: 'Keskin', emoji: '⚡', vector: [0, 0, 1] },
    right: { label: 'Akışkan', emoji: '🌊', vector: [0, 0, -1] }
  },
  {
    id: 3,
    left: { label: 'Canlı', emoji: '🌈', vector: [1, 1, 0] },
    right: { label: 'Pastel', emoji: '🌸', vector: [-1, -1, 0] }
  },
  {
    id: 4,
    left: { label: 'Koyu', emoji: '🌑', vector: [0, -1, 0] },
    right: { label: 'Açık', emoji: '☀️', vector: [0, 1, 0] }
  },
  {
    id: 5,
    left: { label: 'Yoğun', emoji: '💥', vector: [1, 1, 1] },
    right: { label: 'Hafif', emoji: '🪶', vector: [-1, -1, -1] }
  },
  {
    id: 6,
    left: { label: 'Dinamik', emoji: '⚡', vector: [1, 0, 1] },
    right: { label: 'Sakin', emoji: '🕊️', vector: [-1, 0, -1] }
  },
  {
    id: 7,
    left: { label: 'Kontrast', emoji: '⚫⚪', vector: [0, 1, 1] },
    right: { label: 'Uyumlu', emoji: '🎨', vector: [0, -1, -1] }
  },
  {
    id: 8,
    left: { label: 'Elektrik', emoji: '⚡', vector: [1, 1, 1] },
    right: { label: 'Organik', emoji: '🍃', vector: [-1, -1, -1] }
  }
];

export default function TonePage() {
  const router = useRouter();
  const { setToneData, setCurrentStep, completeStep } = useSessionStore();
  
  const [currentPair, setCurrentPair] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isActive, setIsActive] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [choices, setChoices] = useState<Array<{
    pairId: number;
    choice: 'left' | 'right' | 'timeout';
    reactionTime: number;
    vector: [number, number, number];
  }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<ToneData | null>(null);

  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const pairHandledRef = useRef<boolean>(false);

  const clearTimers = () => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    setCurrentStep('tone');
  }, [setCurrentStep]);

  const startPair = () => {
    // reset guards and timers
    pairHandledRef.current = false;
    clearTimers();
    
    setIsActive(true);
    setTimeLeft(TIME_LIMIT);
    startTimeRef.current = performance.now();

    // visual countdown
    tickRef.current = window.setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 50));
    }, 50);

    // hard timeout
    timeoutRef.current = window.setTimeout(() => {
      if (pairHandledRef.current) return;
      pairHandledRef.current = true;
      clearTimers();
      handleTimeout();
    }, TIME_LIMIT);
  };

  const handleChoice = (choice: 'left' | 'right') => {
    if (!isActive || pairHandledRef.current) return;
    pairHandledRef.current = true;
    clearTimers();
    
    const reactionTime = performance.now() - startTimeRef.current;
    const pair = TONE_PAIRS[currentPair];
    const chosenVector = choice === 'left' ? pair.left.vector : pair.right.vector;
    
    const newChoice = {
      pairId: pair.id,
      choice,
      reactionTime,
      vector: chosenVector as [number, number, number]
    };
    
    setChoices(prev => [...prev, newChoice]);
    setIsActive(false);
    
    if (currentPair < TOTAL_PAIRS - 1) {
      // Next pair
      setTimeout(() => {
        setCurrentPair(prev => prev + 1);
      }, 500);
    } else {
      // Test complete
      calculateResults([...choices, newChoice]);
    }
  };

  const handleTimeout = () => {
    if (pairHandledRef.current) return;
    pairHandledRef.current = true;
    clearTimers();
    const newChoice = {
      pairId: TONE_PAIRS[currentPair].id,
      choice: 'timeout' as const,
      reactionTime: TIME_LIMIT,
      vector: [0, 0, 0] as [number, number, number] // Neutral for timeout
    };
    
    setChoices(prev => [...prev, newChoice]);
    setIsActive(false);
    
    if (currentPair < TOTAL_PAIRS - 1) {
      setTimeout(() => {
        setCurrentPair(prev => prev + 1);
      }, 500);
    } else {
      calculateResults([...choices, newChoice]);
    }
  };

  const calculateResults = (allChoices: typeof choices) => {
    // Calculate average vector
    const validChoices = allChoices.filter(c => c.choice !== 'timeout');
    
    if (validChoices.length === 0) {
      // All timeouts
      const toneData: ToneData = {
        vec: [0, 0, 0],
        strength: 0,
        rtAvg: TIME_LIMIT
      };
      setResults(toneData);
      setToneData(toneData);
      setIsComplete(true);
      return;
    }
    
    // Average vector
    const avgVector: [number, number, number] = [
      validChoices.reduce((sum, c) => sum + c.vector[0], 0) / validChoices.length,
      validChoices.reduce((sum, c) => sum + c.vector[1], 0) / validChoices.length,
      validChoices.reduce((sum, c) => sum + c.vector[2], 0) / validChoices.length
    ];
    
    // Vector magnitude (preference strength)
    const magnitude = Math.sqrt(avgVector[0] ** 2 + avgVector[1] ** 2 + avgVector[2] ** 2);
    
    // Log-scaled reaction time score (faster -> higher) with per-choice averaging
    // F1-anchored logarithmic falloff
    // score=100 at rt<=F1_RT_MS, then drops log to 0 at TIME_LIMIT
    const lnMax = Math.log(TIME_LIMIT);
    const lnF1 = Math.log(F1_RT_MS);
    const speedScore100 = validChoices
      .map(c => {
        const rt = Math.max(1, Math.min(TIME_LIMIT, Math.round(c.reactionTime)));
        if (rt <= F1_RT_MS) return 100;
        const s = 100 * (1 - (Math.log(rt) - lnF1) / (lnMax - lnF1));
        return Math.max(0, Math.min(100, s));
      })
      .reduce((a, b) => a + b, 0) / validChoices.length;
    const speed01 = speedScore100 / 100; // 0..1
    
    // Tone strength calculation (log speed has larger impact)
    const normalizedMagnitude = Math.min(1, magnitude / Math.sqrt(3)); // 0..1
    const strength = Math.round(
      Math.max(0, Math.min(100, 50 + 35 * normalizedMagnitude + 25 * speed01))
    );
    
    const toneData: ToneData = {
      vec: avgVector,
      strength: Math.round(strength),
      rtAvg: Math.round(
        validChoices.reduce((sum, c) => sum + c.reactionTime, 0) / validChoices.length
      )
    };
    
    setResults(toneData);
    setToneData(toneData);
    setIsComplete(true);
  };

  const handleStart = () => {
    setShowInstructions(false);
    setTimeout(() => {
      startPair();
    }, 1000);
  };

  const handleRestart = () => {
    setCurrentPair(0);
    setChoices([]);
    setIsComplete(false);
    setResults(null);
    setShowInstructions(true);
    setIsActive(false);
    pairHandledRef.current = false;
    clearTimers();
  };

  const handleComplete = () => {
    completeStep('tone');
    router.push('/breath');
  };

  const getVectorDescription = (vec: [number, number, number]) => {
    const [energy, saturation, texture] = vec;
    
    const traits = [];
    if (Math.abs(energy) > 0.3) traits.push(energy > 0 ? 'Enerjik' : 'Sakin');
    if (Math.abs(saturation) > 0.3) traits.push(saturation > 0 ? 'Canlı' : 'Sade');
    if (Math.abs(texture) > 0.3) traits.push(texture > 0 ? 'Keskin' : 'Yumuşak');
    
    return traits.length > 0 ? traits.join(' • ') : 'Dengeli';
  };

  const getStrengthDescription = (strength: number) => {
    if (strength >= 80) return 'Çok Güçlü';
    if (strength >= 70) return 'Güçlü';
    if (strength >= 60) return 'Orta';
    if (strength >= 50) return 'Zayıf';
    return 'Çok Zayıf';
  };

  // Auto-start next pair
  useEffect(() => {
    if (!isActive && !showInstructions && !isComplete && currentPair < TOTAL_PAIRS) {
      const timer = setTimeout(() => {
        startPair();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPair, isActive, showInstructions, isComplete]);

  // cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-light text-white">
            Ton Tercihi
          </h1>
          
          <p className="text-lg text-slate-300">
            Sezgisel seçimlerini test et
          </p>
        </div>

        {showInstructions ? (
          /* Instructions */
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg p-6 space-y-4">
              <h2 className="text-xl text-white">Nasıl Oynanır?</h2>
              <div className="text-left space-y-2 text-slate-300">
                <p>• 8 çift kart gösterilecek</p>
                <p>• Her çift için <strong>3.5 saniye</strong> süren var</p>
                <p>• Sezgisel olarak birini seç (düşünme, hisset)</p>
                <p>• Zaman dolursa otomatik nötr sayılır</p>
                <p>• Hızlı seçim = güçlü tercih</p>
              </div>
            </div>
            
            <button
              onClick={handleStart}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
            >
              Teste Başla
            </button>
          </div>
        ) : isComplete ? (
          /* Results */
          <div className="space-y-6">
            <div className="text-2xl text-green-400">
              ✓ Test Tamamlandı!
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-6 space-y-4">
              <h3 className="text-xl text-white">Ton Profilin</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Geçerli Seçim:</span>
                  <span className="text-white">
                    {choices.filter(c => c.choice !== 'timeout').length} / {TOTAL_PAIRS}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Ortalama RT:</span>
                  <span className="text-white font-mono">
                    {results?.rtAvg}ms
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Ton Karakteri:</span>
                  <span className="text-white text-sm">
                    {results?.vec ? getVectorDescription(results.vec) : ''}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Tercih Gücü:</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-purple-400">
                      {results?.strength}
                    </span>
                    <span className="text-slate-400 ml-2">/ 100</span>
                    <div className="text-sm text-slate-400">
                      {results?.strength ? getStrengthDescription(results.strength) : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Choice Summary */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-3">Seçimler:</div>
              <div className="grid grid-cols-4 gap-2">
                {choices.map((choice, index) => (
                  <div
                    key={index}
                    className={`text-xs p-2 rounded ${
                      choice.choice === 'timeout' 
                        ? 'bg-red-600/20 text-red-400' 
                        : choice.reactionTime < 1000
                        ? 'bg-green-600/20 text-green-400'
                        : 'bg-purple-600/20 text-purple-400'
                    }`}
                  >
                    #{index + 1}: {choice.choice === 'timeout' ? 'Zaman Aşımı' : 
                      choice.choice === 'left' ? TONE_PAIRS[index].left.label : 
                      TONE_PAIRS[index].right.label}
                    <div className="text-xs opacity-70">{choice.reactionTime}ms</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleRestart}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300"
              >
                Tekrar Dene
              </button>
              
              <button
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
              >
                Nefes Testine Geç →
              </button>
            </div>
          </div>
        ) : (
          /* Active Test */
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="text-lg text-slate-300">
                {currentPair + 1} / {TOTAL_PAIRS}
              </div>
              
              <div className="flex justify-center space-x-1">
                {Array.from({ length: TOTAL_PAIRS }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < currentPair ? 'bg-green-500' :
                      i === currentPair ? 'bg-purple-500' : 'bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Timer */}
            {isActive && (
              <div className="space-y-2">
                <div className="text-sm text-slate-400">
                  {(timeLeft / 1000).toFixed(1)}s
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1">
                  <div 
                    className="bg-red-500 h-1 rounded-full transition-all duration-100"
                    style={{ width: `${100 - (timeLeft / TIME_LIMIT) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Cards */}
            {currentPair < TOTAL_PAIRS && (
              <div className="space-y-4">
                <div className="text-white text-lg">
                  Hangisini hissediyorsun?
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Card */}
                  <button
                    onClick={() => handleChoice('left')}
                    disabled={!isActive}
                    className={`
                      p-8 rounded-lg transition-all duration-300 border-2
                      ${!isActive 
                        ? 'border-slate-600 bg-slate-800/30 text-slate-500 cursor-not-allowed'
                        : 'border-slate-600 bg-slate-800/50 text-white hover:border-purple-500 hover:bg-purple-500/10 hover:scale-105'
                      }
                    `}
                  >
                    <div className="text-4xl mb-3">
                      {TONE_PAIRS[currentPair].left.emoji}
                    </div>
                    <div className="text-xl font-medium">
                      {TONE_PAIRS[currentPair].left.label}
                    </div>
                  </button>

                  {/* Right Card */}
                  <button
                    onClick={() => handleChoice('right')}
                    disabled={!isActive}
                    className={`
                      p-8 rounded-lg transition-all duration-300 border-2
                      ${!isActive 
                        ? 'border-slate-600 bg-slate-800/30 text-slate-500 cursor-not-allowed'
                        : 'border-slate-600 bg-slate-800/50 text-white hover:border-purple-500 hover:bg-purple-500/10 hover:scale-105'
                      }
                    `}
                  >
                    <div className="text-4xl mb-3">
                      {TONE_PAIRS[currentPair].right.emoji}
                    </div>
                    <div className="text-xl font-medium">
                      {TONE_PAIRS[currentPair].right.label}
                    </div>
                  </button>
                </div>

                {!isActive && currentPair < TOTAL_PAIRS && (
                  <div className="text-slate-400 text-sm">
                    Sonraki çift yükleniyor...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
