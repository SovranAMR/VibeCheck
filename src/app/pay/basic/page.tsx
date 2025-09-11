'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/sessionStore';
import { AURA_DESCRIPTIONS } from '@/lib/scoring';

export default function PayBasicPage() {
  const router = useRouter();
  const { session } = useSessionStore();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    // Check if user has already paid for basic
    const hasBasicAccess = localStorage.getItem('basic-access') === 'true';
    setIsUnlocked(hasBasicAccess);
  }, []);

  const handlePayment = () => {
    setShowPayment(true);
    // Simulate payment process
    setTimeout(() => {
      localStorage.setItem('basic-access', 'true');
      setIsUnlocked(true);
      setShowPayment(false);
    }, 2000);
  };

  const scores = session.scores;
  const aura = session.aura;

  if (!scores || !aura) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Sonuçlar bulunamadı. Lütfen testi tamamlayın.</div>
      </div>
    );
  }

  const getScoreDescription = (score: number, category: string) => {
    const descriptions = {
      'F_freq': {
        90: 'Olağanüstü frekans hassasiyeti. Ses titreşimlerine karşı doğal bir yetenek.',
        80: 'Çok iyi frekans algısı. Müzikal ve ses deneyimlerinden derin keyif alırsın.',
        70: 'İyi frekans uyumu. Belirli frekanslarda güçlü rezonans yaşarsın.',
        60: 'Orta seviye frekans duyarlılığı. Gelişim potansiyelin var.',
        50: 'Temel frekans algısı. Daha fazla ses deneyimi faydalı olabilir.',
        default: 'Frekans duyarlılığın geliştirilmesi önerilir.'
      },
      'Chrono': {
        90: 'Mükemmel iç zaman algısı. Doğal bir ritim hissin var.',
        80: 'Çok iyi zamanlama becerisi. Müzik ve dans konularında yeteneklisin.',
        70: 'İyi zaman algısı. Günlük rutinlerde düzenlisin.',
        60: 'Orta seviye zamanlama. Bazen aceleci veya yavaş kalabilirsin.',
        50: 'Temel zaman algısı. Zaman yönetimi konusunda gelişim alanın var.',
        default: 'Zaman algısı geliştirilmeli. Düzenli egzersizler yardımcı olur.'
      },
      'Stability': {
        90: 'Olağanüstü motor kontrol. Hassas işlerde çok başarılısın.',
        80: 'Çok iyi stabilite. El becerisi gerektiren alanlarda yeteneklisin.',
        70: 'İyi motor kontrol. Sanat ve zanaat işlerinde başarılı olabilirsin.',
        60: 'Orta seviye stabilite. Pratikle geliştirebilirsin.',
        50: 'Temel motor kontrol. Koordinasyon egzersizleri faydalı.',
        default: 'Motor kontrol geliştirilmeli. Yoga veya tai chi önerilir.'
      },
      'Tone': {
        90: 'Çok güçlü estetik tercihler. Sanat ve tasarım alanında doğal yetenek.',
        80: 'Güçlü ton duyarlılığı. Görsel ve işitsel estetik konularında başarılısın.',
        70: 'İyi estetik algı. Yaratıcı projelerde potansiyelin yüksek.',
        60: 'Orta seviye ton tercihi. Sanatsal deneyimler seni geliştirir.',
        50: 'Temel estetik algı. Farklı sanat formlarını keşfet.',
        default: 'Estetik duyarlılık geliştirilmeli. Müze ve galeri ziyaretleri önerilir.'
      },
      'Breath': {
        90: 'Mükemmel nefes koheransı. Meditasyon ve mindfulness konularında doğal yetenek.',
        80: 'Çok iyi nefes kontrolü. Stres yönetiminde başarılısın.',
        70: 'İyi nefes ritmi. Yoga ve nefes egzersizleri sana uygun.',
        60: 'Orta seviye nefes koheransı. Düzenli nefes pratiği faydalı.',
        50: 'Temel nefes kontrolü. Nefes teknikleri öğrenmen önerilir.',
        default: 'Nefes koheransı geliştirilmeli. Günlük nefes egzersizleri yap.'
      }
    };

    const categoryDesc = descriptions[category as keyof typeof descriptions];
    if (!categoryDesc) return 'Veri bulunamadı.';

    for (const [threshold, desc] of Object.entries(categoryDesc)) {
      if (threshold === 'default') continue;
      if (score >= parseInt(threshold)) {
        return desc;
      }
    }
    
    return categoryDesc.default;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-yellow-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 60) return 'text-purple-400';
    return 'text-slate-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-4xl md:text-5xl font-light text-white">
            Detaylı Analiz
          </h1>
          <p className="text-slate-300">
            Tüm skorların ve kişisel yorumların
          </p>
        </div>

        {!isUnlocked ? (
          /* Payment Required */
          <div className="bg-slate-800/50 rounded-2xl p-8 text-center space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl text-white">Detaylı Analizini Aç</h2>
              <p className="text-slate-300 max-w-md mx-auto">
                Tüm skorlarını gör, her bileşen için kişisel yorumları oku ve gelişim önerilerini keşfet.
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-3xl font-bold text-green-400">₺19</div>
              <p className="text-sm text-slate-400">Tek seferlik ödeme</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg text-white">İçerikler:</h3>
              <div className="text-left space-y-2 text-slate-300 max-w-md mx-auto">
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>Tüm 5 skor alanının detaylı açılımı</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>Her skor için kişisel yorum ve analiz</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>Gelişim önerileri ve egzersizler</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>Tam radar grafiği görünümü</span>
                </div>
              </div>
            </div>

            {showPayment ? (
              <div className="space-y-4">
                <div className="text-purple-400">Ödeme işleniyor...</div>
                <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <button
                onClick={handlePayment}
                className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 rounded-full text-xl font-medium transition-all duration-300 hover:scale-105"
              >
                ₺19 - Detayları Aç
              </button>
            )}

            <p className="text-xs text-slate-500">
              Güvenli ödeme • Anında erişim • 7 gün para iade garantisi
            </p>
          </div>
        ) : (
          /* Full Content */
          <div className="space-y-8">
            {/* FQI Summary */}
            <div className="bg-slate-800/50 rounded-2xl p-8 text-center space-y-4">
              <div className="text-6xl font-bold text-purple-400">
                {scores.FQI}
              </div>
              <div className="text-xl text-slate-300">
                Frequency Quality Index
              </div>
              <div className="text-slate-400">
                Global ortalamanın %{Math.max(0, scores.percentile - 50)} üzerinde
              </div>
            </div>

            {/* Aura Type */}
            <div className="bg-slate-800/50 rounded-2xl p-8 text-center space-y-4">
              <h2 className="text-2xl text-white">{aura.type} Tipi</h2>
              <p className="text-slate-300 max-w-2xl mx-auto">
                {AURA_DESCRIPTIONS[aura.type]}
              </p>
            </div>

            {/* Detailed Scores */}
            <div className="space-y-6">
              <h2 className="text-2xl font-light text-white text-center">
                Detaylı Skor Analizi
              </h2>

              {/* Frequency Harmony */}
              <div className="bg-slate-800/50 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl text-white">Frekans Uyumu</h3>
                  <span className={`text-2xl font-bold ${getScoreColor(scores.F_freq)}`}>
                    {scores.F_freq}/100
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-purple-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${scores.F_freq}%` }}
                  />
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {getScoreDescription(scores.F_freq, 'F_freq')}
                </p>
              </div>

              {/* Chrono */}
              <div className="bg-slate-800/50 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl text-white">Zaman Algısı</h3>
                  <span className={`text-2xl font-bold ${getScoreColor(scores.Chrono)}`}>
                    {scores.Chrono}/100
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${scores.Chrono}%` }}
                  />
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {getScoreDescription(scores.Chrono, 'Chrono')}
                </p>
              </div>

              {/* Stability */}
              <div className="bg-slate-800/50 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl text-white">Mikro-Stabilite</h3>
                  <span className={`text-2xl font-bold ${getScoreColor(scores.Stability)}`}>
                    {scores.Stability}/100
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${scores.Stability}%` }}
                  />
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {getScoreDescription(scores.Stability, 'Stability')}
                </p>
              </div>

              {/* Tone */}
              <div className="bg-slate-800/50 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl text-white">Ton Gücü</h3>
                  <span className={`text-2xl font-bold ${getScoreColor(scores.Tone)}`}>
                    {scores.Tone}/100
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-pink-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${scores.Tone}%` }}
                  />
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {getScoreDescription(scores.Tone, 'Tone')}
                </p>
              </div>

              {/* Breath */}
              <div className="bg-slate-800/50 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl text-white">Nefes Koheransı</h3>
                  <span className={`text-2xl font-bold ${getScoreColor(scores.Breath)}`}>
                    {scores.Breath}/100
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-cyan-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${scores.Breath}%` }}
                  />
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {getScoreDescription(scores.Breath, 'Breath')}
                </p>
              </div>
            </div>

            {/* Premium Upgrade */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6 text-center space-y-4">
              <h3 className="text-xl text-white">Daha da derine in</h3>
              <p className="text-slate-400">
                Kişisel sigil, detaylı PDF rapor ve favori frekans MP3'ü için tam paketi keşfet.
              </p>
              <button
                onClick={() => router.push('/pay/full')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105"
              >
                ₺99 - Tam Paketi Gör
              </button>
            </div>
          </div>
        )}

        {/* Back to Results */}
        <div className="text-center">
          <button
            onClick={() => router.push('/results')}
            className="text-slate-400 hover:text-slate-300 underline"
          >
            ← Sonuçlara dön
          </button>
        </div>
      </div>
    </div>
  );
}
