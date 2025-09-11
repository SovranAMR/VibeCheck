'use client';

import { useEffect, useState } from 'react';
import { useAudioEngine } from '@/stores/audioEngine';

export default function IOSAudioUnlock() {
  const [showUnlock, setShowUnlock] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { init, unlock, isUnlocked, ctx } = useAudioEngine();

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    // Initialize audio engine
    init();

    // Show unlock prompt on iOS if audio context is suspended
    if (iOS) {
      const checkAudioState = () => {
        if (ctx && ctx.state === 'suspended' && !isUnlocked) {
          setShowUnlock(true);
        }
      };
      
      setTimeout(checkAudioState, 1000);
    }
  }, [init, ctx, isUnlocked]);

  const handleUnlock = async () => {
    try {
      await unlock();
      // Play test tone to verify unlock
      const testCtx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (testCtx.state === 'suspended') {
        await testCtx.resume();
      }
      
      // Play silent test tone
      const osc = testCtx.createOscillator();
      const gain = testCtx.createGain();
      osc.connect(gain);
      gain.connect(testCtx.destination);
      gain.gain.value = 0.1;
      osc.frequency.value = 440;
      osc.start();
      osc.stop(testCtx.currentTime + 0.1);
      
      setShowUnlock(false);
      console.log('iOS Audio unlocked successfully');
    } catch (error) {
      console.error('iOS Audio unlock failed:', error);
    }
  };

  if (!isIOS || !showUnlock || isUnlocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
        <div className="text-4xl mb-4">🔊</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Ses İzni Gerekli
        </h3>
        <p className="text-gray-600 mb-6 text-sm">
          iPhone'da ses çalabilmek için lütfen aşağıdaki butona dokunun.
          Bu işlem sadece bir kez yapılır.
        </p>
        <button
          onClick={handleUnlock}
          className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          Sesi Etkinleştir
        </button>
      </div>
    </div>
  );
}
