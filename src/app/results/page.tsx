'use client';

import { useEffect, useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/sessionStore';
import { calculateFQI, AURA_DESCRIPTIONS, buildAuraNarrative } from '@/lib/scoring';
import { Scores, AuraInfo } from '@/types';
import emailjs from '@emailjs/browser';

// Import the advanced breath analysis function from breath page
const getAdvancedBreathAnalysis = (data: any) => {
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

  return { 
    insights, 
    tips, 
    energetics, 
    constitutionalType,
    therapeuticRecommendations: tips.slice(-3) // Son 3 tavsiye terapötik
  };
};

export default function ResultsPage() {
  const router = useRouter();
  const { session, setScores, setAura, setCurrentStep } = useSessionStore();
  
  const [results, setResults] = useState<{
    scores: Scores;
    aura: AuraInfo;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const storyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentStep('results');
    
    // Sonuçlar zaten hesaplandıysa tekrarlama
    if (results) return;
    
    // Skorları hesapla (store'u sadece eksikse güncelle)
    if (session && Object.keys(session).length > 0) {
      const calculatedResults = calculateFQI(session);
      setResults(calculatedResults);
      if (!session.scores) setScores(calculatedResults.scores);
      if (!session.aura) setAura(calculatedResults.aura);
    }
  }, [session, results, setScores, setAura, setCurrentStep]);

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Sonuçlar hesaplanıyor...</div>
      </div>
    );
  }

  const { scores, aura } = results;

  const handleSendEmail = async () => {
    if (!userEmail || !results) return;
    
    try {
      const templateParams = {
        to_email: 'aliparlakci0@gmail.com', // Senin mail adresin
        user_email: userEmail,
        fqi_score: results.scores.FQI,
        aura_type: results.aura.type,
        frequency: session.freepick?.f || 'N/A',
        stability_score: Math.round(results.scores.Stability),
        tone_score: Math.round(results.scores.Tone),
        breath_score: Math.round(results.scores.Breath),
        test_date: new Date().toLocaleDateString('tr-TR'),
        test_time: new Date().toLocaleTimeString('tr-TR')
      };

      // EmailJS configuration (bu değerleri emailjs.com'dan alacaksın)
      await emailjs.send(
        'service_xxxxxx', // Service ID
        'template_xxxxxx', // Template ID
        templateParams,
        'your_public_key' // Public Key
      );
      
      setEmailSent(true);
      console.log('Email sent successfully!');
    } catch (error) {
      console.error('Email send failed:', error);
      alert('Mail gönderilemedi. Lütfen tekrar deneyin.');
    }
  };

  const handleShare = async () => {
    if (!storyRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(storyRef.current, { 
        pixelRatio: 2,
        width: 1080,
        height: 1920,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        },
        backgroundColor: '#0f172a'
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'frekans-sonuc.png', { type: 'image/png' });
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: 'Frekans Profilim' });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'frekans-sonuc.png';
        link.click();
        setShowShareModal(true);
      }
    } catch (e) {
      setShowShareModal(true);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-yellow-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 60) return 'text-purple-400';
    return 'text-slate-400';
  };

  const getFQIDescription = (fqi: number) => {
    if (fqi >= 160) return 'Mükemmel';
    if (fqi >= 140) return 'Çok İyi';
    if (fqi >= 120) return 'İyi';
    if (fqi >= 100) return 'Orta Üstü';
    if (fqi >= 80) return 'Orta';
    if (fqi >= 60) return 'Gelişebilir';
    return 'Başlangıç Seviyesi';
  };

  const metricDesc = (key: 'F_freq' | 'Tone' | 'Stability' | 'Chrono' | 'Breath') => {
    const map: Record<string, string> = {
      F_freq: 'Frekans Uyumu: Ses titreşimlerine uyum ve rezonans hassasiyeti.',
      Tone: 'Ses Tercihi: Hızlı ve doğal seçim yapma eğilimin (reaksiyon dengesi).',
      Stability: 'Mikro-Stabilite: Hassas hareketlerde el-göz koordinasyonu.',
      Chrono: 'Zaman Algısı: İç ritim ve süre tahmin doğruluğu.',
      Breath: 'Nefes Düzeni: Ritim tutarlılığı ve sakinleşme kapasitesi.'
    };
    return map[key];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Instagram Story Card - Hidden but used for sharing */}
      <div ref={storyRef} className="fixed -top-[9999px] left-0 w-[1080px] h-[1920px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-16 text-white">
        <div className="text-center space-y-12">
          {/* Logo/Title */}
          <div className="space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Frekans Profilim
            </h1>
            <div className="text-2xl text-slate-300">
              Kişisel Ses & Titreşim Analizi
            </div>
          </div>

          {/* Main Score */}
          <div className="bg-white/10 rounded-3xl p-12 backdrop-blur-sm">
            <div className="text-8xl font-bold mb-4">
              {Math.round(scores.FQI)}
            </div>
            <div className="text-3xl text-purple-300 mb-2">FQI Skorun</div>
            <div className="text-2xl text-slate-300">
              {getFQIDescription(scores.FQI)}
            </div>
          </div>

          {/* Aura Type */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl p-8">
            <div className="text-4xl font-bold mb-2">{aura?.type}</div>
            <div className="text-xl text-slate-300 leading-relaxed max-w-2xl">
              {AURA_DESCRIPTIONS[aura?.type || 'Solar'] || 'Frekans profilin analiz ediliyor...'}
            </div>
          </div>

          {/* Mini Stats */}
          <div className="grid grid-cols-2 gap-6 text-center">
            <div className="bg-white/5 rounded-2xl p-6">
              <div className="text-3xl font-bold text-blue-400">{Math.round(scores.F_freq)}</div>
              <div className="text-lg text-slate-300">Frekans Uyumu</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-6">
              <div className="text-3xl font-bold text-green-400">{Math.round(scores.Stability)}</div>
              <div className="text-lg text-slate-300">Stabilite</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-6">
              <div className="text-3xl font-bold text-yellow-400">{Math.round(scores.Tone)}</div>
              <div className="text-lg text-slate-300">Tercih Gücü</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-6">
              <div className="text-3xl font-bold text-pink-400">{Math.round(scores.Breath)}</div>
              <div className="text-lg text-slate-300">Nefes Düzeni</div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xl text-slate-400">
            frekanstest.com
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-4xl md:text-5xl font-light text-white">
            Frekans Profilin
          </h1>
          <p className="text-slate-300">
            Kişisel frekans analizin tamamlandı
          </p>
        </div>

        {/* Main FQI Score */}
        <div className="bg-slate-800/50 rounded-2xl p-8 text-center space-y-4">
          <div className="space-y-2">
            <div className="text-6xl font-bold text-purple-400">
              {scores.FQI}
            </div>
            <div className="text-xl text-slate-300">
              FQI (Frequency Quality Index)
            </div>
            <div className="text-lg text-purple-300">
              {getFQIDescription(scores.FQI)}
            </div>
          </div>
          
          <div className="text-slate-400">
            Global ortalamanın %{Math.max(0, scores.percentile - 50)} {scores.percentile >= 50 ? 'üzerinde' : 'altında'}
          </div>
        </div>

        {/* Aura Type with Breath Archetype */}
        <div className="bg-slate-800/50 rounded-2xl p-8 text-center space-y-4">
          <div className="space-y-2">
            <div className="text-3xl font-light text-white">
              {aura.type} Tipi
            </div>
            <div className="text-slate-300 max-w-md mx-auto">
              {AURA_DESCRIPTIONS[aura.type]}
            </div>
          </div>
          
          {/* Sigil Placeholder */}
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <div className="text-4xl">✨</div>
          </div>

          {/* Breath-driven subtitle if available */}
          {session?.breath && (
            <div className="pt-4 text-slate-300 text-sm max-w-xl mx-auto">
              {buildAuraNarrative(aura, session)}
            </div>
          )}
        </div>

        {/* Radar Chart - Simplified (2 axes visible, 3 locked) */}
        <div className="bg-slate-800/50 rounded-2xl p-8">
          <h2 className="text-2xl font-light text-white mb-6 text-center">
            Frekans Profili
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visible Scores */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Frekans Uyumu</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${scores.F_freq}%` }}
                    />
                  </div>
                  <span className={`font-bold ${getScoreColor(scores.F_freq)}`}>
                    {scores.F_freq}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Ses Tercihi</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${scores.Tone}%` }}
                    />
                  </div>
                  <span className={`font-bold ${getScoreColor(scores.Tone)}`}>
                    {scores.Tone}
                  </span>
                </div>
              </div>
            </div>

            {/* Locked Scores */}
            <div className="space-y-4 opacity-50">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Zaman Algısı</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-slate-700 rounded-full h-2">
                    <div className="bg-slate-600 h-2 rounded-full w-full blur-sm" />
                  </div>
                  <span className="text-slate-500 font-bold">🔒</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Stabilite</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-slate-700 rounded-full h-2">
                    <div className="bg-slate-600 h-2 rounded-full w-full blur-sm" />
                  </div>
                  <span className="text-slate-500 font-bold">🔒</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nefes Düzeni</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-slate-700 rounded-full h-2">
                    <div className="bg-slate-600 h-2 rounded-full w-full blur-sm" />
                  </div>
                  <span className="text-slate-500 font-bold">🔒</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body Location Analysis - Multiple Selection Summary */}
        {session?.fixed && session.fixed.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-2xl p-8 space-y-6">
            <h2 className="text-2xl font-light text-white text-center mb-6">
              Vücut Haritası Analizi
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Baş ve Boyun */}
              <div className="text-center">
                <div className="text-3xl mb-2">🧠</div>
                <h3 className="text-purple-400 font-medium mb-2">Baş ve Boyun</h3>
                <div className="text-2xl font-bold text-white mb-1">
                  {session.fixed.reduce((count, f) => {
                    const upperBodies = ['crown', 'forehead', 'eyes', 'ears', 'throat'];
                    return count + f.locus.filter(l => upperBodies.includes(l)).length;
                  }, 0)}
                </div>
                <div className="text-xs text-slate-400">seçim</div>
              </div>

              {/* Göğüs ve Kollar */}
              <div className="text-center">
                <div className="text-3xl mb-2">❤️</div>
                <h3 className="text-pink-400 font-medium mb-2">Göğüs ve Kollar</h3>
                <div className="text-2xl font-bold text-white mb-1">
                  {session.fixed.reduce((count, f) => {
                    const middleBodies = ['heart', 'chest', 'solar_plexus', 'arms', 'hands'];
                    return count + f.locus.filter(l => middleBodies.includes(l)).length;
                  }, 0)}
                </div>
                <div className="text-xs text-slate-400">seçim</div>
              </div>

              {/* Karın ve Bacaklar */}
              <div className="text-center">
                <div className="text-3xl mb-2">🔥</div>
                <h3 className="text-orange-400 font-medium mb-2">Karın ve Bacaklar</h3>
                <div className="text-2xl font-bold text-white mb-1">
                  {session.fixed.reduce((count, f) => {
                    const lowerBodies = ['belly', 'sacral', 'legs', 'feet', 'spine'];
                    return count + f.locus.filter(l => lowerBodies.includes(l)).length;
                  }, 0)}
                </div>
                <div className="text-xs text-slate-400">seçim</div>
              </div>

              {/* Genel Alanlar */}
              <div className="text-center">
                <div className="text-3xl mb-2">✨</div>
                <h3 className="text-yellow-400 font-medium mb-2">Genel Alanlar</h3>
                <div className="text-2xl font-bold text-white mb-1">
                  {session.fixed.reduce((count, f) => {
                    const generalBodies = ['full_body', 'aura_field', 'no_sensation'];
                    return count + f.locus.filter(l => generalBodies.includes(l)).length;
                  }, 0)}
                </div>
                <div className="text-xs text-slate-400">seçim</div>
              </div>
            </div>
            
            <div className="text-center text-sm text-slate-400 pt-4">
              Frekansları hangi vücut bölgelerinde hissettiğinizin dağılımı
            </div>
          </div>
        )}

        {/* Advanced Breath Analysis (if available) */}
        {session?.breath && (
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-2xl p-6 space-y-6">
            <h2 className="text-2xl font-light text-white text-center">
              Gelişmiş Nefes Profili
            </h2>
            
            {(() => {
              const analysis = getAdvancedBreathAnalysis(session.breath);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Constitutional Type */}
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <div className="text-sm text-purple-300 mb-3 font-medium">🧬 Nefes Tipin</div>
                    <div className="space-y-2 text-left">
                      {analysis.constitutionalType.map((t, i) => (
                        <div key={`const-${i}`} className="text-white/90 text-sm">{t}</div>
                      ))}
                    </div>
                  </div>

                  {/* Energetics */}
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <div className="text-sm text-green-300 mb-3 font-medium">⚡ Enerji Profilin</div>
                    <div className="space-y-2 text-left">
                      {analysis.energetics.map((t, i) => (
                        <div key={`ener-${i}`} className="text-white/90 text-sm">{t}</div>
                      ))}
                    </div>
                  </div>

                  {/* Core Insights */}
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-3">🔍 Ana Bulgular</div>
                    <div className="space-y-2 text-left">
                      {analysis.insights.map((t, i) => (
                        <div key={`ins-${i}`} className="text-white/90 text-sm">• {t}</div>
                      ))}
                    </div>
                  </div>

                  {/* Therapeutic Recommendations */}
                  {analysis.tips.length > 0 && (
                    <div className="bg-slate-800/30 rounded-lg p-4">
                      <div className="text-sm text-orange-300 mb-3 font-medium">🌿 Öneriler</div>
                      <div className="space-y-2 text-left">
                        {analysis.tips.slice(0, 3).map((t, i) => (
                          <div key={`tip-${i}`} className="text-white/90 text-sm">→ {t}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="space-y-4">
          {/* Basic Unlock */}
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center space-y-4">
            <h3 className="text-xl text-white">Detaylı Analizi Aç</h3>
            <p className="text-slate-400 text-sm">
              Tüm skorları gör, kişisel yorumları oku
            </p>
            <button 
              onClick={() => router.push('/pay/basic')}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105">
              ₺19 - Detayları Aç
            </button>
          </div>

          {/* Premium Unlock */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6 text-center space-y-4">
            <h3 className="text-xl text-white">Kişisel Sembol + Tam Rapor</h3>
            <p className="text-slate-400 text-sm">
              AI üretimi özel sembol, detaylı PDF rapor, 3dk favori frekans MP3
            </p>
            <button 
              onClick={() => router.push('/pay/full')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105">
              ₺99 - Tam Paketi Al
            </button>
          </div>
        </div>

        {/* Share */}
        <div className="text-center space-y-4">
          <button
            onClick={handleShare}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-full font-medium transition-all duration-300"
          >
            📤 Sonucu Paylaş
          </button>
          
          <div className="text-xs text-slate-500">
            "Benim Frekans Profilim {scores.FQI} çıktı ({aura.type} tipi). Seninki ne?"
          </div>
        </div>

        {/* Email Notification */}
        <div className="bg-slate-800/50 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg text-white text-center">📧 Sonuçları Mail Olarak Al</h3>
          <p className="text-sm text-slate-400 text-center">
            Test sonuçlarını mail adresine gönderebiliriz
          </p>
          
          {!emailSent ? (
            <div className="space-y-3">
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Mail adresin"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={handleSendEmail}
                disabled={!userEmail}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-all duration-300"
              >
                📧 Mail Gönder
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-green-400 text-lg">✅ Mail Gönderildi!</div>
              <div className="text-sm text-slate-400 mt-2">
                Test sonuçların {userEmail} adresine gönderildi.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <button
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-slate-300 underline"
          >
            Yeni test yap
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-sm w-full space-y-4">
            <h3 className="text-white text-lg">Panoya Kopyalandı!</h3>
            <p className="text-slate-300 text-sm">
              Sonucun panoya kopyalandı. Sosyal medyada paylaşabilirsin.
            </p>
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
