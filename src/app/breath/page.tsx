'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioEngine } from '@/stores/audioEngine';
import { useSessionStore } from '@/stores/sessionStore';
import { BreathData } from '@/types';

const TOTAL_CYCLES = 4;
const MIN_BREATH_DURATION = 200; // 200ms minimum

export default function BreathPage() {
  const router = useRouter();
  const { setBreathData, setCurrentStep, completeStep } = useSessionStore();
  const audio = useAudioEngine();
  
  const [currentCycle, setCurrentCycle] = useState(0);
  const [phase, setPhase] = useState<'waiting' | 'inhale' | 'exhale'>('waiting');
  const [isPressed, setIsPressed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<BreathData | null>(null);
  
  const [breathCycles, setBreathCycles] = useState<Array<{
    inhale: number;
    exhale: number;
    total: number;
  }>>([]);
  
  // Stage: natural cycles -> deep inhales
  const [stage, setStage] = useState<'natural' | 'deep'>('natural');
  const [deepInhales, setDeepInhales] = useState<number[]>([]);
  const [deepExhales, setDeepExhales] = useState<number[]>([]);
  const [deepInhaleAvgMs, setDeepInhaleAvgMs] = useState<number | null>(null);
  const [deepExhaleAvgMs, setDeepExhaleAvgMs] = useState<number | null>(null);
  
  const phaseStartRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const [circleScale, setCircleScale] = useState(1);
  const lastInhaleRef = useRef<number>(0);

  useEffect(() => {
    setCurrentStep('breath');
    // Force override body background with !important
    document.body.style.setProperty('background', 'linear-gradient(to bottom right, #0f172a, #581c87, #0f172a)', 'important');
    document.body.style.setProperty('min-height', '100vh', 'important');
    
    return () => {
      // Reset body background when leaving the page
      document.body.style.removeProperty('background');
      document.body.style.removeProperty('min-height');
    };
  }, [setCurrentStep]);

  const startTest = () => {
    console.log('startTest called - initializing breath test');
    setShowInstructions(false);
    setCurrentCycle(0);
    setBreathCycles([]);
    setPhase('waiting');
    setStage('natural');
    setDeepInhales([]);
    setDeepExhales([]);
    setDeepInhaleAvgMs(null);
    setDeepExhaleAvgMs(null);
    setIsComplete(false);
    setResults(null);
    setCircleScale(1);
    
    // Clear any running animations
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    console.log('Breath test initialized - user can now start breathing');
    
    // Otomatik olarak ilk inhale'i başlat (daha iyi UX için)
    setTimeout(() => {
      console.log('Auto-starting first inhale phase');
      startInhalePhase();
    }, 1000); // 1 saniye bekle ki kullanıcı hazırlanabilsin
  };

  const startInhalePhase = () => {
    setPhase('inhale');
    phaseStartRef.current = performance.now();
    
    // Animate circle growing
    const animate = () => {
      setCircleScale(prev => Math.min(2, prev + 0.01));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  const handlePress = () => {
    console.log('handlePress called - showInstructions:', showInstructions, 'isComplete:', isComplete, 'phase:', phase, 'stage:', stage);
    if (showInstructions || isComplete) return;
    const now = performance.now();
    
    if (stage === 'natural') {
      // If we are ending an exhale, close the cycle
      if (phase === 'exhale') {
        const exhaleTime = now - phaseStartRef.current;
        const inhaleTime = lastInhaleRef.current;
        if (inhaleTime >= MIN_BREATH_DURATION && exhaleTime >= MIN_BREATH_DURATION) {
          setBreathCycles(prev => {
            const newCycle = { inhale: inhaleTime, exhale: exhaleTime, total: inhaleTime + exhaleTime };
            const updated = [...prev, newCycle];
            console.log('Natural cycle completed:', newCycle, 'Total cycles:', updated.length);
            // advance cycle count
            setCurrentCycle(updated.length);
            // If natural cycles are done, move to deep stage
            if (updated.length >= TOTAL_CYCLES) {
              console.log('All natural cycles completed, moving to deep stage');
              setStage('deep');
              setPhase('waiting');
              setCircleScale(1);
              // Clear any running animation
              if (animationRef.current) cancelAnimationFrame(animationRef.current);
            }
            return updated;
          });
        }
      }
    } else if (stage === 'deep') {
      // In deep stage: a new PRESS indicates the previous exhale is completed
      if (phase === 'exhale') {
        const exhaleTime = now - phaseStartRef.current;
        console.log('Deep exhale (on press) completed:', exhaleTime, 'ms');
        // Record exhale if we still need more
        setDeepExhales(prev => {
          if (prev.length >= 3) return prev; // safety guard
          const updated = [...prev, exhaleTime];
          console.log('Deep exhale recorded. Total deep exhales:', updated.length);
          // If finished 3 deep breaths, finalize
          if (updated.length >= 3) {
            const iAvg = deepInhales.reduce((s, v) => s + v, 0) / Math.max(1, deepInhales.length);
            const eAvg = updated.reduce((s, v) => s + v, 0) / updated.length;
            setDeepInhaleAvgMs(Math.round(iAvg));
            setDeepExhaleAvgMs(Math.round(eAvg));
            calculateResults(breathCycles);
          }
          return updated;
        });

        // If not finished yet, immediately start next inhale
        if (deepExhales.length < 3) {
          setIsPressed(true);
          setPhase('inhale');
          phaseStartRef.current = now;
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
          const animateGrow = () => {
            setCircleScale(prev => Math.min(2, prev + 0.01));
            animationRef.current = requestAnimationFrame(animateGrow);
          };
          animationRef.current = requestAnimationFrame(animateGrow);
        }
      }
    }
    
    // Start inhale (for both stages)
    setIsPressed(true);
    setPhase('inhale');
    phaseStartRef.current = now;
    // start grow animation
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const animateGrow = () => {
      setCircleScale(prev => Math.min(2, prev + 0.01));
      animationRef.current = requestAnimationFrame(animateGrow);
    };
    animationRef.current = requestAnimationFrame(animateGrow);
  };

  const handleRelease = () => {
    console.log('handleRelease called - showInstructions:', showInstructions, 'isComplete:', isComplete, 'phase:', phase, 'stage:', stage, 'isPressed:', isPressed);
    if (showInstructions || isComplete) return;
    const now = performance.now();
    
    // Ending inhale (works for both natural and deep)
    if (phase === 'inhale' && isPressed) {
      setIsPressed(false);
      const inhaleTime = now - phaseStartRef.current;
      lastInhaleRef.current = inhaleTime;
      console.log('Inhale completed:', inhaleTime, 'ms, stage:', stage);
      
      // stop grow animation
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      
      if (stage === 'natural') {
        // switch to exhale and wait for next press
        setPhase('exhale');
        phaseStartRef.current = now;
        console.log('Natural stage: switched to exhale phase');
        // start shrink animation
        const animateShrink = () => {
          setCircleScale(prev => Math.max(0.5, prev - 0.01));
          animationRef.current = requestAnimationFrame(animateShrink);
        };
        animationRef.current = requestAnimationFrame(animateShrink);
      } else {
        // deep mode: record inhale and start tracking exhale
        setDeepInhales(prev => {
          if (prev.length >= 3) return prev; // guard against over-counting
          const updated = [...prev, inhaleTime];
          console.log('Deep inhale recorded:', inhaleTime, 'ms. Total deep inhales:', updated.length);
          return updated;
        });
        setPhase('exhale');
        phaseStartRef.current = now;
        console.log('Deep stage: switched to exhale phase');
        const animateShrink = () => {
          setCircleScale(prev => Math.max(0.5, prev - 0.01));
          animationRef.current = requestAnimationFrame(animateShrink);
        };
        animationRef.current = requestAnimationFrame(animateShrink);
      }
    }
    // Ending exhale moved to handlePress for deep stage
  };

  const calculateResults = (cycles: typeof breathCycles) => {
    if (cycles.length === 0) {
      const breathData: BreathData = {
        inhaleAvg: 0,
        exhaleAvg: 0,
        ratio: 1,
        cv: 1,
        bpm: 0,
        score: 0
      };
      setResults(breathData);
      setBreathData(breathData);
      
      // Auto-complete and navigate to results immediately
      console.log('Breath test completed (no valid cycles), navigating to results');
      completeStep('breath');
      router.push('/results');
      return;
    }
    
    // Calculate averages
    const inhaleAvg = cycles.reduce((sum, c) => sum + c.inhale, 0) / cycles.length;
    const exhaleAvg = cycles.reduce((sum, c) => sum + c.exhale, 0) / cycles.length;
    const totalAvg = cycles.reduce((sum, c) => sum + c.total, 0) / cycles.length;
    const deepInAvg = deepInhaleAvgMs ?? 0;
    const deepExAvg = deepExhaleAvgMs ?? 0;
    
    // Ratio
    const ratio = inhaleAvg / exhaleAvg;
    
    // Coefficient of variation (consistency)
    const totalStd = Math.sqrt(
      cycles.reduce((sum, c) => sum + Math.pow(c.total - totalAvg, 2), 0) / cycles.length
    );
    const cv = totalStd / totalAvg;
    
    // BPM (breaths per minute)
    const bpm = 60000 / totalAvg; // totalAvg is in ms
    
    // Helpers
    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    
    // 1) Coherence (consistency) – lower CV is better
    const coherenceScore = clamp(100 - cv * 220, 0, 100);
    
    // 2) Resonance (target ~5.5 bpm). Full score if 4.5–6.5, then decays linearly to 0 at ±3 bpm
    const resonanceDeviation = Math.abs(bpm - 5.5);
    const resonanceScore = clamp(100 - (resonanceDeviation / 3) * 100, 0, 100);
    
    // 3) Natural ratio preference (exhale a bit longer than inhale, ~1.2)
    const ei = exhaleAvg / inhaleAvg; // exhale over inhale
    const ratioDiff = Math.abs(Math.log(ei / 1.2));
    const naturalRatioScore = clamp(100 - (ratioDiff / Math.log(2)) * 100, 0, 100);
    
    // 4) Depth magnitude from deep breathing (avg of deep inhale/exhale). Map 2–8s → 0–100
    const deepAvgBoth = (deepInAvg > 0 && deepExAvg > 0) ? (deepInAvg + deepExAvg) / 2 : 0;
    const depthMagScore = deepAvgBoth
      ? clamp(((deepAvgBoth - 2000) / 6000) * 100, 0, 100)
      : NaN;
    
    // 5) Deep ratio balance (~1.2 exhale/inhale)
    const deepRatio = deepInAvg > 0 && deepExAvg > 0 ? deepExAvg / deepInAvg : 0;
    const deepRatioDiff = deepRatio ? Math.abs(Math.log(deepRatio / 1.2)) : 0;
    const deepRatioScore = deepRatio ? clamp(100 - (deepRatioDiff / Math.log(2)) * 100, 0, 100) : NaN;
    
    // Weighted blend (renormalize if deep scores missing)
    const parts: Array<{score: number; weight: number}> = [
      { score: coherenceScore, weight: 0.35 },
      { score: resonanceScore, weight: 0.25 },
      { score: naturalRatioScore, weight: 0.15 },
      { score: isNaN(depthMagScore) ? 0 : depthMagScore, weight: isNaN(depthMagScore) ? 0 : 0.15 },
      { score: isNaN(deepRatioScore) ? 0 : deepRatioScore, weight: isNaN(deepRatioScore) ? 0 : 0.10 },
    ];
    const totalWeight = parts.reduce((w, p) => w + p.weight, 0) || 1;
    const finalScore = Math.round(parts.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight);
    
    const breathData: BreathData = {
      inhaleAvg: Math.round(inhaleAvg),
      exhaleAvg: Math.round(exhaleAvg),
      ratio: Math.round(ratio * 100) / 100,
      cv: Math.round(cv * 1000) / 1000,
      bpm: Math.round(bpm * 10) / 10,
      score: finalScore,
      deepInhaleAvg: deepInAvg ? Math.round(deepInAvg) : undefined,
      deepExhaleAvg: deepExAvg ? Math.round(deepExAvg) : undefined
    };
    
    setResults(breathData);
    setBreathData(breathData);
    
    // Auto-complete and navigate to results immediately
    console.log('Breath test completed, navigating to results');
    completeStep('breath');
    router.push('/results');
  };

  const handleRestart = () => {
    setCurrentCycle(0);
    setBreathCycles([]);
    setIsComplete(false);
    setResults(null);
    setShowInstructions(true);
    setPhase('waiting');
    setIsPressed(false);
    setCircleScale(1);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleComplete = () => {
    // Save breath data to session store before completing
    if (results) {
      setBreathData(results);
      console.log('Breath data saved to session store:', results);
    }
    completeStep('breath');
    router.push('/results');
  };

  const getCoherenceDescription = (score: number) => {
    if (score >= 90) return 'Mükemmel';
    if (score >= 80) return 'Çok İyi';
    if (score >= 70) return 'İyi';
    if (score >= 60) return 'Orta';
    if (score >= 50) return 'Zayıf';
    return 'Çok Zayıf';
  };

  const getRatioDescription = (ratio: number) => {
    if (ratio > 1.2) return 'Uzun nefes alma';
    if (ratio < 0.8) return 'Uzun nefes verme';
    return 'Dengeli nefes';
  };

  // Map breath metrics to an audible frequency suggestion (temporal harmonic mapping)
  const suggestFrequency = (data: BreathData) => {
    const breathHz = Math.max(0.05, data.bpm / 60); // breaths per second
    // Bring to audible band around ~432 Hz
    const ideal = 432;
    const k = Math.round(Math.log2(ideal / breathHz));
    const mapped = breathHz * Math.pow(2, k);
    // Candidate set
    const candidates = [220, 256, 320, 396, 432, 444, 528, 639];
    // Style bias by ratio
    const ei = data.exhaleAvg / Math.max(1, data.inhaleAvg);
    const favored = ei > 1.1 ? [396, 432, 256, 220] : ei < 0.9 ? [528, 444, 639] : [432, 396, 444];
    const all = [...favored, ...candidates.filter(c => !favored.includes(c))];
    // Pick nearest to mapped among ordered list
    let best = all[0];
    let bestDiff = Math.abs(all[0] - mapped);
    for (const f of all) {
      const d = Math.abs(f - mapped);
      if (d < bestDiff) { best = f; bestDiff = d; }
    }
    const mode = ei > 1.1 ? 'sakinleştirici' : ei < 0.9 ? 'canlandırıcı' : 'dengeleyici';
    return { frequency: best, mapped: Math.round(mapped), mode };
  };

  // Advanced breath analysis with ancient wisdom + modern alternative medicine
  const getAdvancedBreathAnalysis = (data: BreathData) => {
    const insights: string[] = [];
    const tips: string[] = [];
    const energetics: string[] = [];
    const constitutionalType: string[] = [];

    // === KADIM PRANAYAMA ANALİZİ ===
    
    // 1) Dosha/Constitution Analysis (Ayurveda)
    if (data.bpm <= 6) {
      constitutionalType.push('🌙 Kapha baskın: Yavaş, derin, istikrarlı nefes. Topraklama güçlü, ama hareketsizlik riski.');
      tips.push('Kapha için: Sabah enerjik nefes (Bhastrika), baharatlı çaylar, aktif hareket.');
    } else if (data.bpm >= 12) {
      constitutionalType.push('🔥 Vata baskın: Hızlı, değişken ritim. Yaratıcı enerji yüksek, ama dağınık olabilir.');
      tips.push('Vata için: Düzenli Nadi Shodhana (alternatif burun nefesi), sıcak yağ masajı, rutin.');
    } else {
      constitutionalType.push('☀️ Pitta baskın: Orta tempolu, odaklanmış nefes. Liderlik enerjisi, ama öfke riski.');
      tips.push('Pitta için: Sheetali (serinletici nefes), gece meditasyonu, soğuk içecekler.');
    }

    // 2) TCM Element Analysis (5 Element Theory)
    const ratio = data.ratio;
    if (ratio > 1.2) {
      energetics.push('🌳 Ağaç elementi baskın: Büyüme, planlama, vizyon güçlü. Karaciğer meridyeni aktif.');
      tips.push('Ağaç için: Sabah 6-8 arası nefes egzersizi, yeşil çay, esnek hareket.');
    } else if (ratio < 0.8) {
      energetics.push('🔥 Ateş elementi baskın: İfade, neşe, sosyallik güçlü. Kalp meridyeni aktif.');
      tips.push('Ateş için: Öğlen 11-13 arası güneş nefesi, gülme meditasyonu, kırmızı yiyecekler.');
    } else {
      energetics.push('🌍 Toprak elementi baskın: Denge, merkezleme, beslenme güçlü. Mide-dalak meridyeni aktif.');
      tips.push('Toprak için: Yemek öncesi nefes, sarı renkli yiyecekler, toprakla temas.');
    }

    // 3) Chakra Analysis
    if (data.deepInhaleAvg && data.deepExhaleAvg) {
      const deepTotal = data.deepInhaleAvg + data.deepExhaleAvg;
      if (deepTotal > 8000) {
        insights.push('🔵 Üst çakralar aktif: Derin kapasite yüksek, ruhsal bağlantı güçlü.');
        tips.push('Üst çakra için: Taç çakra meditasyonu, mor ışık visualizasyonu, sessizlik.');
      } else if (deepTotal < 4000) {
        insights.push('🔴 Alt çakralar aktif: Pratik, fiziksel, hayatta kalma odaklı enerji.');
        tips.push('Alt çakra için: Kök çakra nefesi, kırmızı visualizasyon, yürüyüş.');
      } else {
        insights.push('💚 Kalp çakra dengeli: Sevgi, empati, denge merkezi güçlü.');
        tips.push('Kalp çakra için: Yeşil ışık meditasyonu, doğa sesleri, şefkat pratiği.');
      }
    }

    // 4) Nervous System State (Polyvagal Theory)
    if (data.cv < 0.1) {
      insights.push('🧘 Parasempatik baskın: Dinlenme-onarım modu aktif, derin iyileşme kapasitesi.');
      tips.push('Parasempatik için: Yin yoga, sıcak banyo, yavaş müzik, erken uyku.');
    } else if (data.cv > 0.3) {
      insights.push('⚡ Sempatik aktif: Uyanık, tepkisel, stres yönetimi gerekli.');
      tips.push('Sempatik için: Box breathing (4-4-4-4), soğuk duş, adaptojenik bitkiler.');
    } else {
      insights.push('⚖️ Otonom denge: Esnek adaptasyon kapasitesi, optimal performans.');
      tips.push('Denge için: Değişken nefes rutinleri, mevsimsel adaptasyon, çeşitlilik.');
    }

    // 5) Circadian Rhythm Analysis
    const currentHour = new Date().getHours();
    if (data.bpm < 8 && currentHour >= 6 && currentHour <= 10) {
      insights.push('🌅 Sabah yavaşlığı: Kapha saati, doğal detoks modu.');
      tips.push('Sabah için: Sıcak su+limon, güneş selamı, canlandırıcı nefes.');
    } else if (data.bpm > 10 && currentHour >= 14 && currentHour <= 18) {
      insights.push('🌇 Öğleden sonra hızlanması: Vata saati, yaratıcı zirve.');
      tips.push('Öğleden sonra için: Protein atıştırmalık, topraklanma, yavaşlatıcı nefes.');
    }

    // 6) Seasonal Constitutional Adjustment
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) { // İlkbahar
      tips.push('🌸 İlkbahar detoksu: Karaciğer temizliği, yeşil smoothie, dinamik nefes.');
    } else if (month >= 5 && month <= 7) { // Yaz
      tips.push('☀️ Yaz serinliği: Serinletici nefes, su içme, gölge meditasyonu.');
    } else if (month >= 8 && month <= 10) { // Sonbahar
      tips.push('🍂 Sonbahar beslenme: Sıcak yiyecek, kök nefesi, topraklanma.');
    } else { // Kış
      tips.push('❄️ Kış ısınma: Isıtıcı nefes, baharatlar, içe dönük meditasyon.');
    }

    return { 
      insights, 
      tips, 
      energetics, 
      constitutionalType,
      therapeuticRecommendations: tips.slice(-3) // Son 3 tavsiye terapötik
    };
  };

  // Touch and mouse event handlers - use refs to avoid dependency issues
  const handlePressRef = useRef(handlePress);
  const handleReleaseRef = useRef(handleRelease);
  
  useEffect(() => {
    handlePressRef.current = handlePress;
  }, [handlePress]);
  
  useEffect(() => {
    handleReleaseRef.current = handleRelease;
  }, [handleRelease]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Ignore clicks on buttons and interactive elements
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        console.log('Mouse down ignored - clicked on button');
        return;
      }
      console.log('Mouse down event triggered for breathing area');
      handlePressRef.current();
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        console.log('Mouse up ignored - clicked on button');
        return;
      }
      console.log('Mouse up event triggered for breathing area');
      handleReleaseRef.current();
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      // Ignore touches on buttons and interactive elements
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        console.log('Touch start ignored - touched button');
        return;
      }
      e.preventDefault();
      console.log('Touch start event triggered for breathing area');
      handlePressRef.current();
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        console.log('Touch end ignored - touched button');
        return;
      }
      e.preventDefault();
      console.log('Touch end event triggered for breathing area');
      handleReleaseRef.current();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []); // Empty dependency - set once

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4 overflow-auto" style={{zIndex: 0}}>
      <div className="max-w-2xl w-full text-center space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-light text-white">
            Nefes Koheransı
          </h1>
          
          <p className="text-lg text-slate-300">
            Nefes ritmin ne kadar tutarlı?
          </p>
        </div>

        {showInstructions ? (
          /* Instructions */
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg p-6 space-y-4">
              <h2 className="text-xl text-white">Nasıl Yapılır?</h2>
              <div className="text-left space-y-2 text-slate-300">
                <p>• Doğal nefesini kaydediyoruz: <strong>AL</strong> sırasında basılı tut, <strong>VER</strong> sırasında bırak</p>
                <p>• Kılavuz yok; kendi ritminde 4 döngü tamamla</p>
                <p>• Ardından 3 kez <strong>derin nefes al</strong> (sonuna kadar) – AL ve VER süreleri ölçülür</p>
                <p>• Mouse/dokunma ile kontrol edebilirsin</p>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent document event listeners
                console.log('Start Test button clicked');
                startTest();
              }}
              onMouseDown={(e) => e.stopPropagation()} // Prevent document mousedown
              onTouchStart={(e) => e.stopPropagation()} // Prevent document touchstart
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
              <h3 className="text-xl text-white">Nefes Analizin</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Geçerli Döngü:</span>
                  <span className="text-white">{breathCycles.length} / {TOTAL_CYCLES}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Ortalama AL:</span>
                  <span className="text-white font-mono">
                    {results ? (results.inhaleAvg / 1000).toFixed(1) : 0}s
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Ortalama VER:</span>
                  <span className="text-white font-mono">
                    {results ? (results.exhaleAvg / 1000).toFixed(1) : 0}s
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">AL/VER Oranı:</span>
                  <span className="text-white">
                    {results?.ratio} ({results ? getRatioDescription(results.ratio) : ''})
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Tutarlılık:</span>
                  <span className="text-white">
                    CV = {results ? (results.cv * 100).toFixed(1) : 0}%
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Nefes/Dakika:</span>
                  <span className="text-white font-mono">
                    {results?.bpm}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Koherans Skoru:</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-purple-400">
                      {results?.score}
                    </span>
                    <span className="text-slate-400 ml-2">/ 100</span>
                    <div className="text-sm text-slate-400">
                      {results?.score ? getCoherenceDescription(results.score) : ''}
                    </div>
                  </div>
                </div>

                {/* Deep breathing averages if present */}
                {results?.deepInhaleAvg && results?.deepExhaleAvg && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-700/40 rounded p-3">
                      <div className="text-slate-400 text-xs">Derin AL Ort.</div>
                      <div className="text-white font-mono">{(results.deepInhaleAvg / 1000).toFixed(1)}s</div>
                    </div>
                    <div className="bg-slate-700/40 rounded p-3">
                      <div className="text-slate-400 text-xs">Derin VER Ort.</div>
                      <div className="text-white font-mono">{(results.deepExhaleAvg / 1000).toFixed(1)}s</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Insights */}
            {results && (
              <div className="space-y-4">
                {(() => {
                  const analysis = getAdvancedBreathAnalysis(results);
                  const rec = suggestFrequency(results);
                  return (
                    <>
                      {/* Constitutional Type */}
                      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4">
                        <div className="text-sm text-purple-300 mb-2 font-medium">🧬 Konstitüsyonel Tip</div>
                        <div className="space-y-1 text-left">
                          {analysis.constitutionalType.map((t, i) => (
                            <div key={`const-${i}`} className="text-white/90 text-sm">{t}</div>
                          ))}
                        </div>
                      </div>

                      {/* Energetics */}
                      <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 rounded-lg p-4">
                        <div className="text-sm text-green-300 mb-2 font-medium">⚡ Enerjetik Profil</div>
                        <div className="space-y-1 text-left">
                          {analysis.energetics.map((t, i) => (
                            <div key={`ener-${i}`} className="text-white/90 text-sm">{t}</div>
                          ))}
                        </div>
                      </div>

                      {/* Core Insights */}
                      <div className="bg-slate-800/30 rounded-lg p-4">
                        <div className="text-sm text-slate-400 mb-2">🔍 Temel Analiz</div>
                        <div className="space-y-1 text-left">
                          {analysis.insights.map((t, i) => (
                            <div key={`ins-${i}`} className="text-white/90 text-sm">• {t}</div>
                          ))}
                        </div>
                      </div>

                      {/* Therapeutic Recommendations */}
                      {analysis.tips.length > 0 && (
                        <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-lg p-4">
                          <div className="text-sm text-orange-300 mb-2 font-medium">🌿 Terapötik Öneriler</div>
                          <div className="space-y-1 text-left">
                            {analysis.tips.map((t, i) => (
                              <div key={`tip-${i}`} className="text-white/90 text-sm">→ {t}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Frequency Recommendation */}
                      <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-lg p-4">
                        <div className="text-sm text-indigo-300 mb-2 font-medium">🎵 Frekans Rezonansı</div>
                        <div className="text-purple-300 text-sm">
                          Nefes ritmin {rec.mode} için ≈ {rec.frequency} Hz (eşlenik {rec.mapped} Hz) öneriliyor.
                          <button
                            onClick={() => audio.makeTone(rec.frequency, 2.0, 'sine', true)}
                            className="ml-2 px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs"
                          >► Dinle</button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Cycle Details */}
            {breathCycles.length > 0 && (
              <div className="bg-slate-800/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-3">Döngü Detayları:</div>
                <div className="space-y-1">
                  {breathCycles.map((cycle, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-slate-400">#{index + 1}:</span>
                      <span className="text-white font-mono">
                        AL {(cycle.inhale / 1000).toFixed(1)}s • 
                        VER {(cycle.exhale / 1000).toFixed(1)}s • 
                        Toplam {(cycle.total / 1000).toFixed(1)}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestart();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300"
              >
                Tekrar Dene
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleComplete();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105"
              >
                Sonuçları Gör →
              </button>
            </div>
          </div>
        ) : (
          /* Active Test */
          <div className="space-y-8">
            {/* Progress */}
            <div className="space-y-2">
              {stage === 'natural' ? (
                <>
                  <div className="text-lg text-slate-300">
                    Doğal Nefes: Döngü {currentCycle + 1} / {TOTAL_CYCLES}
                  </div>
                  
                  <div className="flex justify-center space-x-1">
                    {Array.from({ length: TOTAL_CYCLES }, (_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < currentCycle ? 'bg-green-500' :
                          i === currentCycle ? 'bg-purple-500' : 'bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg text-slate-300">
                    Derin Nefes: {deepInhales.length} / 3 tamamlandı
                  </div>
                  
                  <div className="flex justify-center space-x-1">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < deepInhales.length ? 'bg-blue-500' :
                          i === deepInhales.length ? 'bg-orange-500' : 'bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Breathing Circle */}
            <div className="flex flex-col items-center space-y-6">
              <div className="relative w-80 h-80 flex items-center justify-center">
                {/* Animated Circle */}
                <div
                  className={`
                    w-40 h-40 rounded-full border-4 transition-all duration-100
                    ${phase === 'inhale' ? 'border-blue-400 bg-blue-400/20' :
                      phase === 'exhale' ? 'border-red-400 bg-red-400/20' : 
                      'border-slate-600 bg-slate-600/20'
                    }
                  `}
                  style={{
                    transform: `scale(${circleScale})`,
                    boxShadow: phase !== 'waiting' ? '0 0 30px rgba(139, 92, 246, 0.3)' : 'none'
                  }}
                />
                
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  {phase === 'waiting' && (
                    <div className="text-lg">Hazırlan...</div>
                  )}
                  {phase === 'inhale' && (
                    <>
                      <div className="text-2xl font-bold">AL</div>
                      <div className="text-sm">basılı tut</div>
                    </>
                  )}
                  {phase === 'exhale' && (
                    <>
                      <div className="text-2xl font-bold">VER</div>
                      <div className="text-sm">bırak</div>
                    </>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center space-y-2">
                {stage === 'natural' ? (
                  <>
                    {phase === 'inhale' && (
                      <div className="text-blue-400">🫁 Nefes alırken basılı tut</div>
                    )}
                    {phase === 'exhale' && (
                      <div className="text-red-400">💨 Nefes verirken bırak</div>
                    )}
                    {phase === 'waiting' && (
                      <div className="text-yellow-400">
                        {currentCycle === 0 ? 
                          "🫁 İlk nefesini al, başlarken butona bas" : 
                          "Bir sonraki nefesini almaya hazır ol"
                        }
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-blue-300">Derin nefes: AL sırasında basılı tut, VER sırasında bırak (AL ve VER süreleri ölçülür - 3 kez)</div>
                )}
              </div>
            </div>

            {/* Completed Cycles */}
            {breathCycles.length > 0 && (
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">Tamamlanan döngüler:</div>
                <div className="flex justify-center space-x-3 text-xs">
                  {breathCycles.map((cycle, index) => (
                    <div key={index} className="text-center">
                      <div className="text-slate-400">#{index + 1}</div>
                      <div className="text-white font-mono">
                        {(cycle.total / 1000).toFixed(1)}s
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
