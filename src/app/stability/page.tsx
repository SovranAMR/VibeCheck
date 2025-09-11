'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/sessionStore';
import { StabilityData } from '@/types';

const TEST_DURATION = 30000; // 30 seconds
const SAMPLE_INTERVAL = 50; // 50ms sampling
const TARGET_RADIUS = 80; // pixels - larger circle
const CENTER_SIZE = 8; // pixels

interface Position {
  x: number;
  y: number;
  timestamp: number;
  tx?: number; // target x at sample time
  ty?: number; // target y at sample time
}

export default function StabilityPage() {
  const router = useRouter();
  const { setStabilityData, setCurrentStep, completeStep } = useSessionStore();
  
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [showInstructions, setShowInstructions] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<StabilityData | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastSampleRef = useRef<number>(0);
  const centerRef = useRef({ x: 0, y: 0 });
  const targetMoveRef = useRef<number>(0);
  const positionsRef = useRef<Position[]>([]);
  const targetPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Set canvas center on mount and resize
  useEffect(() => {
    const updateCenter = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        centerRef.current = {
          x: rect.width / 2,
          y: rect.height / 2
        };
      }
    };
    
    updateCenter();
    window.addEventListener('resize', updateCenter);
    return () => window.removeEventListener('resize', updateCenter);
  }, []);

  useEffect(() => {
    setCurrentStep('stability');
  }, [setCurrentStep]);

  const getPointerPosition = useCallback((e: MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return null;
    
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return null;
    }
    
    const pos = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
    
    console.log('Canvas rect:', rect);
    console.log('Client pos:', clientX, clientY);
    console.log('Canvas pos:', pos.x, pos.y);
    
    return pos;
  }, []);

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isRunning) return;
    
    const pos = getPointerPosition(e);
    if (!pos) return;
    
    setCurrentPos(pos);
    
    const now = performance.now();
    if (now - lastSampleRef.current >= SAMPLE_INTERVAL) {
      const tx = targetPosRef.current.x || centerRef.current.x;
      const ty = targetPosRef.current.y || centerRef.current.y;
      positionsRef.current.push({ x: pos.x, y: pos.y, tx, ty, timestamp: now });
      setPositions(prev => [...prev, { x: pos.x, y: pos.y, tx, ty, timestamp: now }]);
      lastSampleRef.current = now;
    }
  }, [isRunning, getPointerPosition]);

  const startTest = () => {
    console.log('Starting test - setting isRunning to true');
    setShowInstructions(false);
    setIsRunning(true);
    setTimeLeft(TEST_DURATION);
    setPositions([]);
    positionsRef.current = [];
    
    // Initialize target at center
    const center = centerRef.current;
    setTargetPos({ x: center.x, y: center.y });
    targetPosRef.current = { x: center.x, y: center.y };
    
    startTimeRef.current = performance.now();
    lastSampleRef.current = performance.now();
    targetMoveRef.current = performance.now();
    
    console.log('Test started, isRunning should be true now');
    
    // Start animation loop for timer and target movement
    const animate = () => {
      if (!startTimeRef.current) return;
      
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      const remaining = Math.max(0, TEST_DURATION - elapsed);
      
      setTimeLeft(remaining);
      
      // Move target every 2 seconds
      if (now - targetMoveRef.current > 2000) {
        const center = centerRef.current;
        const radius = 60; // Larger movement radius 
        const angle = Math.random() * 2 * Math.PI;
        const newTarget = {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius
        };
        setTargetPos(newTarget);
        targetPosRef.current = newTarget;
        targetMoveRef.current = now;
      }
      
      if (remaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        finishTest();
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const finishTest = () => {
    setIsRunning(false);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    calculateResults();
  };

  const calculateResults = () => {
    // Get final positions count before any state changes from ref to avoid stale state
    const finalPositions = positionsRef.current;
    console.log('Calculate results - positions length:', finalPositions.length);
    console.log('Positions sample:', finalPositions.slice(0, 3));
    
    if (finalPositions.length < 10) {
      // Not enough movement detected - invalid
      alert(`İmleci basılı tut ve hedefte kal. Sadece ${finalPositions.length} hareket algılandı (minimum 10 gerekli).`);
      handleRestart();
      return;
    }
    
    // Calculate RMS distance from MOVING TARGET (tx, ty)
    const distances = finalPositions.map(pos => {
      const targetX = pos.tx ?? centerRef.current.x;
      const targetY = pos.ty ?? centerRef.current.y;
      const dx = pos.x - targetX;
      const dy = pos.y - targetY;
      return Math.sqrt(dx * dx + dy * dy);
    });
    
    const rms = Math.sqrt(distances.reduce((sum, d) => sum + d * d, 0) / distances.length);
    
    // Normalize score: 100 - (RMS / R0) * 100, clamped to 0-100
    const normalizedScore = Math.max(0, Math.min(100, 100 - (rms / TARGET_RADIUS) * 100));
    const score = Math.round(normalizedScore);
    
    const stabilityData: StabilityData = {
      rms,
      score
    };
    
    setResults(stabilityData);
    setStabilityData(stabilityData);
    setIsComplete(true);
  };

  const handleRestart = () => {
    setIsComplete(false);
    setResults(null);
    setShowInstructions(true);
    setPositions([]);
    setTimeLeft(TEST_DURATION);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleComplete = () => {
    completeStep('stability');
    router.push('/tone');
  };

  // Event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      console.log('Mouse move detected:', e.clientX, e.clientY);
      handlePointerMove(e);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      console.log('Touch move detected:', e.touches[0]?.clientX, e.touches[0]?.clientY);
      handlePointerMove(e);
    };

    if (isRunning) {
      // Only track when mouse is over canvas
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      // Debug events
      canvas.addEventListener('mouseenter', () => console.log('Mouse entered canvas'));
      canvas.addEventListener('mouseleave', () => console.log('Mouse left canvas'));
    }

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('mouseenter', () => {});
      canvas.removeEventListener('mouseleave', () => {});
    };
  }, [isRunning, handlePointerMove]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size exactly
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    console.log('Canvas internal size:', canvas.width, canvas.height);
    console.log('Canvas display size:', rect.width, rect.height);

    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    centerRef.current = center;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw target circle
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, TARGET_RADIUS, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw target (purple dot) - moves around (no center dot)
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.arc(targetPos.x || center.x, targetPos.y || center.y, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw current cursor position (green dot) if running
    if (isRunning && currentPos.x !== 0 && currentPos.y !== 0) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(currentPos.x, currentPos.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw line from cursor to target
      const target = { x: targetPos.x || center.x, y: targetPos.y || center.y };
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(currentPos.x, currentPos.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      
      // Debug info
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.fillText(`Pos: ${currentPos.x.toFixed(0)}, ${currentPos.y.toFixed(0)}`, 10, 20);
      ctx.fillText(`Samples: ${positions.length}`, 10, 40);
      
      // Distance from target
      const distance = Math.sqrt(Math.pow(currentPos.x - target.x, 2) + Math.pow(currentPos.y - target.y, 2));
      ctx.fillText(`Distance: ${distance.toFixed(1)}px`, 10, 60);
    }

    // Draw trail if running
    if (isRunning && positions.length > 1) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(positions[0].x, positions[0].y);
      for (let i = 1; i < positions.length; i++) {
        ctx.lineTo(positions[i].x, positions[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, [currentPos, positions, isRunning]);

  const getScoreDescription = (score: number) => {
    if (score >= 90) return 'Olağanüstü';
    if (score >= 80) return 'Çok İyi';
    if (score >= 70) return 'İyi';
    if (score >= 60) return 'Orta';
    if (score >= 50) return 'Zayıf';
    return 'Çok Zayıf';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-light text-white">
            Mikro-Stabilite
          </h1>
          
          <p className="text-lg text-slate-300">
            Motor kontrolün ne kadar tutarlı?
          </p>
        </div>

        {showInstructions ? (
          /* Instructions */
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg p-6 space-y-4">
              <h2 className="text-xl text-white">Nasıl Oynanır?</h2>
              <div className="text-left space-y-2 text-slate-300">
                <p>• İmleci (mouse/parmak) mor noktanın üzerinde tut</p>
                <p>• 30 saniye boyunca mümkün olduğunca sabit kal</p>
                <p>• Çemberin içinde kalmaya çalış</p>
                <p>• Küçük titremeler normal, büyük sapmalara dikkat</p>
                <p>• Mobilde: parmağını ekranda sürükle</p>
              </div>
            </div>
            
            <button
              onClick={startTest}
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
              <h3 className="text-xl text-white">Sonuçların</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Örneklem Sayısı:</span>
                  <span className="text-white">{positions.length}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Ortalama Sapma:</span>
                  <span className="text-white font-mono">
                    {results?.rms.toFixed(1)} piksel
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Stabilite Skoru:</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-purple-400">
                      {results?.score}
                    </span>
                    <span className="text-slate-400 ml-2">/ 100</span>
                    <div className="text-sm text-slate-400">
                      {results?.score ? getScoreDescription(results.score) : ''}
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
                Ton Testine Geç →
              </button>
            </div>
          </div>
        ) : (
          /* Active Test */
          <div className="space-y-6">
            {/* Timer */}
            <div className="space-y-2">
              <div className="text-2xl font-mono text-purple-400">
                {Math.ceil(timeLeft / 1000)}s
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${((TEST_DURATION - timeLeft) / TEST_DURATION) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Canvas */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                className="w-full h-80 cursor-crosshair touch-none"
                style={{ touchAction: 'none' }}
                onMouseMove={(e) => {
                  console.log('Mouse move detected, isRunning:', isRunning);
                  if (!isRunning) {
                    console.log('Mouse move ignored - not running');
                    return;
                  }
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  console.log('Mouse position:', x, y);
                  setCurrentPos({ x, y });
                  
                  // Add to positions for tracking EVERY TIME (remove throttling for now)
                  const now = performance.now();
                  console.log('Adding position immediately:', x, y);
                  setPositions(prev => {
                    const newPositions = [...prev, {
                      x,
                      y,
                      timestamp: now
                    }];
                    console.log('New positions array length:', newPositions.length);
                    return newPositions;
                  });
                }}
              />
            </div>

            {/* Instructions */}
            <div className="text-sm text-slate-400 space-y-1">
              <p>Yeşil noktayı (imleç) mor nokta üzerinde tutmaya çalış</p>
              <p>Yeşil çizgi: hedefe mesafe | Yeşil iz: hareket geçmişi</p>
            </div>

            {/* Stats */}
            {positions.length > 0 && (
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-xs text-slate-500">
                  Örneklem: {positions.length} | 
                  Ortalama sapma: {(
                    positions.reduce((sum, pos) => {
                      const targetX = (pos.tx ?? centerRef.current.x);
                      const targetY = (pos.ty ?? centerRef.current.y);
                      const dx = pos.x - targetX;
                      const dy = pos.y - targetY;
                      return sum + Math.sqrt(dx * dx + dy * dy);
                    }, 0) / positions.length
                  ).toFixed(1)}px
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
