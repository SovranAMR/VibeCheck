'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/sessionStore';
import { ChronoData } from '@/types';

const TARGET_TIME = 10.0; // 10 seconds
const TOTAL_TRIALS = 3;

export default function ChronoPage() {
  const router = useRouter();
  const { setChronoData, setCurrentStep, completeStep } = useSessionStore();
  
  const [currentTrial, setCurrentTrial] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [trials, setTrials] = useState<number[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentStep('chrono');
  }, [setCurrentStep]);

  const startTrial = () => {
    if (isRunning) return;
    
    setShowInstructions(false);
    setIsRunning(true);
    const now = performance.now();
    setStartTime(now);
    startTimeRef.current = now;
  };

  const stopTrial = () => {
    if (!isRunning || !startTimeRef.current) return;
    
    const endTime = performance.now();
    const duration = (endTime - startTimeRef.current) / 1000; // Convert to seconds
    
    setIsRunning(false);
    setStartTime(null);
    startTimeRef.current = null;
    
    const newTrials = [...trials, duration];
    setTrials(newTrials);
    
    if (newTrials.length >= TOTAL_TRIALS) {
      // All trials completed
      calculateResults(newTrials);
    } else {
      // Move to next trial
      setCurrentTrial(prev => prev + 1);
    }
  };

  const calculateResults = (trialTimes: number[]) => {
    // Calculate errors
    const errors = trialTimes.map(t => Math.abs(t - TARGET_TIME));
    
    // Mean Absolute Percentage Error
    const mape = (errors.reduce((sum, err) => sum + err, 0) / errors.length / TARGET_TIME) * 100;
    
    // Bias (positive = slow-time, negative = fast-time)
    const bias = trialTimes.reduce((sum, t) => sum + (t - TARGET_TIME), 0) / trialTimes.length;
    
    // Score calculation: MAPE 0% → 100 points, 10% → ~65 points, 20% → ~30 points
    const score = Math.round(Math.max(0, Math.min(100, 100 - (mape * 3.5))));
    
    const chronoData: ChronoData = {
      trials: trialTimes,
      mape,
      bias,
      score
    };
    
    setChronoData(chronoData);
    setIsComplete(true);
  };

  const handleComplete = () => {
    completeStep('chrono');
    router.push('/stability');
  };

  const handleRestart = () => {
    setCurrentTrial(0);
    setTrials([]);
    setIsComplete(false);
    setShowInstructions(true);
    setIsRunning(false);
    setStartTime(null);
    startTimeRef.current = null;
  };

  const formatTime = (seconds: number) => {
    return seconds.toFixed(2) + 's';
  };

  const getBiasDescription = (bias: number) => {
    if (Math.abs(bias) < 0.5) return 'Mükemmel zamanlama';
    if (bias > 0) return 'Yavaş zaman algısı';
    return 'Hızlı zaman algısı';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 90) return 'Olağanüstü';
    if (score >= 80) return 'Çok İyi';
    if (score >= 70) return 'İyi';
    if (score >= 60) return 'Orta';
    if (score >= 50) return 'Zayıf';
    return 'Çok Zayıf';
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (isRunning) {
          stopTrial();
        } else if (!isComplete && !showInstructions) {
          startTrial();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, isComplete, showInstructions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-light text-white">
            Zaman Algısı
          </h1>
          
          <p className="text-lg text-slate-300">
            İç saatin ne kadar hassas?
          </p>
        </div>

        {showInstructions ? (
          /* Instructions */
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg p-6 space-y-4">
              <h2 className="text-xl text-white">Nasıl Oynanır?</h2>
              <div className="text-left space-y-2 text-slate-300">
                <p>• "Başla" düğmesine bas ve zamanlama başlasın</p>
                <p>• Tam <strong>10.0 saniye</strong> sonra "Dur" düğmesine bas</p>
                <p>• Ekranda geri sayım görmeyeceksin - sadece iç zamanlaman</p>
                <p>• Toplam 3 deneme yapacaksın</p>
                <p>• Space tuşu ile de kontrol edebilirsin</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowInstructions(false)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
            >
              Anladım, Başlayalım
            </button>
          </div>
        ) : isComplete ? (
          /* Results */
          <div className="space-y-6">
            <div className="text-2xl text-green-400">
              ✓ Test Tamamlandı!
            </div>
            
            {/* Trial Results */}
            <div className="bg-slate-800/50 rounded-lg p-6 space-y-4">
              <h3 className="text-xl text-white">Sonuçların</h3>
              
              <div className="space-y-3">
                {trials.map((time, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-slate-300">Deneme {index + 1}:</span>
                    <div className="text-right">
                      <span className="text-white font-mono">{formatTime(time)}</span>
                      <span className={`ml-2 text-sm ${
                        Math.abs(time - TARGET_TIME) < 0.5 ? 'text-green-400' :
                        Math.abs(time - TARGET_TIME) < 1.0 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        ({time > TARGET_TIME ? '+' : ''}{formatTime(time - TARGET_TIME)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-slate-600 pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Ortalama Hata:</span>
                  <span className="text-white font-mono">
                    {((trials.reduce((sum, t) => sum + Math.abs(t - TARGET_TIME), 0) / trials.length)).toFixed(2)}s
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Zaman Eğilimi:</span>
                  <span className="text-white">
                    {getBiasDescription(trials.reduce((sum, t) => sum + (t - TARGET_TIME), 0) / trials.length)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Skor:</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-purple-400">
                      {Math.round(Math.max(0, Math.min(100, 100 - ((trials.reduce((sum, t) => sum + Math.abs(t - TARGET_TIME), 0) / trials.length / TARGET_TIME) * 100 * 3.5))))}
                    </span>
                    <span className="text-slate-400 ml-2">
                      / 100
                    </span>
                    <div className="text-sm text-slate-400">
                      {getScoreDescription(Math.round(Math.max(0, Math.min(100, 100 - ((trials.reduce((sum, t) => sum + Math.abs(t - TARGET_TIME), 0) / trials.length / TARGET_TIME) * 100 * 3.5)))))}
                    </div>
                  </div>
                </div>
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
                Stabilite Testine Geç →
              </button>
            </div>
          </div>
        ) : (
          /* Active Trial */
          <div className="space-y-8">
            {/* Trial Progress */}
            <div className="space-y-2">
              <div className="text-lg text-slate-300">
                Deneme {currentTrial + 1} / {TOTAL_TRIALS}
              </div>
              
              <div className="flex justify-center space-x-1">
                {Array.from({ length: TOTAL_TRIALS }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < currentTrial ? 'bg-green-500' :
                      i === currentTrial ? 'bg-purple-500' : 'bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Main Interface */}
            <div className="space-y-6">
              <div className="text-xl text-white">
                Tam 10.0 saniye sonra dur düğmesine bas
              </div>

              {isRunning ? (
                <div className="space-y-6">
                  <div className="text-4xl text-purple-400 animate-pulse">
                    ⏱️ Sayıyor...
                  </div>
                  
                  <button
                    onClick={stopTrial}
                    className="bg-red-600 hover:bg-red-700 text-white px-12 py-4 rounded-full text-xl font-medium transition-all duration-300 hover:scale-105"
                  >
                    DUR!
                  </button>
                  
                  <div className="text-sm text-slate-400">
                    Space tuşuna da basabilirsin
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-2xl text-slate-400">
                    Hazır mısın?
                  </div>
                  
                  <button
                    onClick={startTrial}
                    className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 rounded-full text-xl font-medium transition-all duration-300 hover:scale-105"
                  >
                    BAŞLA
                  </button>
                  
                  <div className="text-sm text-slate-400">
                    Space tuşuna da basabilirsin
                  </div>
                </div>
              )}
            </div>

            {/* Previous Trial Results */}
            {trials.length > 0 && (
              <div className="bg-slate-800/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-2">Önceki denemeler:</div>
                <div className="flex justify-center space-x-4">
                  {trials.map((time, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xs text-slate-500">#{index + 1}</div>
                      <div className="text-sm font-mono text-white">{formatTime(time)}</div>
                      <div className={`text-xs ${
                        Math.abs(time - TARGET_TIME) < 0.5 ? 'text-green-400' :
                        Math.abs(time - TARGET_TIME) < 1.0 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {time > TARGET_TIME ? '+' : ''}{formatTime(time - TARGET_TIME)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
