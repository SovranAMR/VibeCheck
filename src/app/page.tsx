'use client';

import { useRouter } from 'next/navigation';

export default function Landing() {
  const router = useRouter();

  const handleStartTest = () => {
    router.push('/start');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        {/* Ana başlık */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-light text-white tracking-wide">
            Frekansını ölç,
            <br />
            <span className="text-purple-300">frekansına bak.</span>
          </h1>
          
          <div className="space-y-2 text-lg text-slate-300 max-w-lg mx-auto leading-relaxed">
            <p>Ses titreşimleriyle kişisel rezonans imzanı keşfet.</p>
            <p>Dakikalar içinde benzersiz frekans profilini ortaya çıkar.</p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-8">
          <button
            onClick={handleStartTest}
            className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-4 rounded-full text-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/25"
          >
            Testi Başlat
          </button>
        </div>

        {/* Küçük not */}
        <div className="pt-8 text-sm text-slate-400 space-y-1">
          <p>🎧 Kulaklık önerilir. Ses seviyeni konforlu tut.</p>
        </div>
      </div>

      {/* Footer disclaimer */}
      <footer className="absolute bottom-8 text-center">
        <p className="text-xs text-slate-500 max-w-md">
          Sonuçlar resmi manada bir gerçeklik taşımaz, deneyseldir.
        </p>
      </footer>
    </div>
  );
}