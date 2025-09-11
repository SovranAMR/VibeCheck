'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioEngine } from '@/stores/audioEngine';
import { useSessionStore } from '@/stores/sessionStore';

export default function StartPage() {
  const router = useRouter();
  const { init, unlock, isUnlocked } = useAudioEngine();
  const { initSession, setCurrentStep } = useSessionStore();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize audio engine on mount
    init();
    setCurrentStep('start');
  }, [init, setCurrentStep]);

  const handleUnlockAudio = async () => {
    console.log('Button clicked!'); // Debug log
    setIsLoading(true);
    
    try {
      // Initialize session
      initSession();
      console.log('Session initialized');
      
      // Unlock audio context
      await unlock();
      console.log('Audio unlock attempted, isUnlocked:', isUnlocked);
      
      // Force redirect regardless of unlock status for now
      setIsReady(true);
      setTimeout(() => {
        router.push('/calibration');
      }, 1500);
      
    } catch (error) {
      console.error('Audio unlock failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        {/* Başlık */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-light text-white">
            Hazırlık
          </h1>
          
          <div className="text-lg text-slate-300 space-y-3 leading-relaxed">
            <p>🎧 Kulaklığını tak ve sessiz bir ortamda ol.</p>
            <p>Ses deneyimi için tarayıcı iznini aktifleştireceğiz.</p>
          </div>
        </div>

        {/* Status */}
        {isReady ? (
          <div className="space-y-4">
            <div className="text-green-400 text-xl">
              ✓ Ses sistemi hazır!
            </div>
            <p className="text-slate-400">Kalibrasyon sayfasına yönlendiriliyorsun...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ana buton */}
            <button
              onClick={() => {
                console.log('Direct click handler');
                alert('Buton çalışıyor!');
                handleUnlockAudio();
              }}
              disabled={false}
              className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-4 rounded-full text-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/25"
            >
              {isLoading ? 'Hazırlanıyor...' : 'Başlamak İçin Dokun'}
            </button>

            {/* Alt bilgi */}
            <div className="text-sm text-slate-400 space-y-2">
              <p>Bu işlem ses çalmak için gerekli tarayıcı izinlerini açar.</p>
              <p>Hiçbir kişisel veri toplanmaz, yalnızca ölçüm sonuçları kaydedilir.</p>
            </div>
          </div>
        )}

        {/* İlerleme göstergesi */}
        <div className="pt-8">
          <div className="flex items-center justify-center space-x-2 text-slate-500">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
              1
            </div>
            <div className="w-12 h-0.5 bg-slate-700"></div>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">
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
    </div>
  );
}
