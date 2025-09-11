import { Session, FixedFreqItem, QuickFeel, Scores, AuraInfo, AuraType, BreathData } from '@/types';

// Sabit frekanslar listesi
const FIXED_FREQUENCIES = [40, 110, 220, 432, 528, 1000, 4000, 8000];

/**
 * Ana FQI hesaplama fonksiyonu
 */
export function calculateFQI(session: Partial<Session>): { scores: Scores; aura: AuraInfo } {
  // Alt skorları hesapla
  const F_freq = calculateFrequencyScore(session);
  const Chrono = session.chrono?.score || 0;
  const Stability = session.stability?.score || 0;
  const Tone = session.tone?.strength || 0;
  const Breath = session.breath?.score || 0;

  // Z-skorları hesapla (σ=12 varsayımıyla)
  const sigma = 12;
  const z_freq = (F_freq - 50) / sigma;
  const z_chrono = (Chrono - 50) / sigma;
  const z_stability = (Stability - 50) / sigma;
  const z_tone = (Tone - 50) / sigma;
  const z_breath = (Breath - 50) / sigma;

  // Ağırlıklı Z-skor
  const FQI_z = 0.40 * z_freq + 0.15 * z_chrono + 0.10 * z_stability + 0.15 * z_tone + 0.20 * z_breath;

  // FQI skoruna çevir (40-170 aralığı)
  let FQI = Math.round(Math.max(40, Math.min(170, 100 + 15 * FQI_z)));

  // Efsane gate kontrolü (160-170)
  const isLegendary = checkLegendaryGate(session, F_freq, Chrono, Stability, Tone, Breath);
  if (!isLegendary && FQI >= 160) {
    FQI = 159; // Gate koşulları sağlanmazsa 159'da kal
  }

  // Yüzdelik hesaplama (basit model)
  const percentile = calculatePercentile(FQI);

  const scores: Scores = {
    F_freq: Math.round(F_freq),
    Chrono: Math.round(Chrono),
    Stability: Math.round(Stability),
    Tone: Math.round(Tone),
    Breath: Math.round(Breath),
    FQI,
    percentile
  };

  // Aura tipi ataması
  const aura = assignAuraType(session);

  return { scores, aura };
}

/**
 * Frekans bileşeni skorunu hesapla (F_freq)
 */
function calculateFrequencyScore(session: Partial<Session>): number {
  const fixed = session.fixed || [];
  const prefeel = session.prefeel || [];
  const freepick = session.freepick;

  if (fixed.length === 0) return 0;

  // 1. Seçicilik (selectivity): like eğrisinin keskinliği
  const selectivity = calculateSelectivity(fixed);

  // 2. Koherans: prefeel ile main ölçümlerinin tutarlılığı
  const coherence = calculateCoherence(prefeel, fixed);

  // 3. Valence: iyi vs zor his oranı
  const valence = calculateValence(fixed);

  // 4. Nefes anahtar uyumu
  const breathAlignment = calculateBreathAlignment(fixed, session.breath || null);

  // Bileşen skorları (0-100)
  const selectivityScore = Math.max(0, Math.min(100, selectivity));
  const coherenceScore = Math.max(0, Math.min(100, coherence));
  const valenceScore = Math.max(0, Math.min(100, 50 + valence * 50)); // -1..1 → 0..100
  const breathScore = Math.max(0, Math.min(100, breathAlignment));

  // Ağırlıklı toplam
  // Breath anahtarı entegrasyonu: 0.30 seçicilik, 0.30 koherans, 0.20 valence, 0.20 nefes uyumu
  const F_freq = 0.30 * selectivityScore + 0.30 * coherenceScore + 0.20 * valenceScore + 0.20 * breathScore;

  return F_freq;
}

/**
 * Seçicilik hesaplama: like skorlarının peak keskinliği
 */
function calculateSelectivity(fixed: FixedFreqItem[]): number {
  if (fixed.length < 3) return 0;

  const likes = fixed.map(f => f.like);
  const mean = likes.reduce((sum, like) => sum + like, 0) / likes.length;
  
  // Varyans hesapla
  const variance = likes.reduce((sum, like) => sum + Math.pow(like - mean, 2), 0) / likes.length;
  const stdDev = Math.sqrt(variance);

  // Yüksek varyans = yüksek seçicilik
  // stdDev 0-30 aralığını 0-100'e map et
  const selectivity = Math.min(100, (stdDev / 30) * 100);

  return selectivity;
}

/**
 * Koherans hesaplama: prefeel ile main ölçümlerin tutarlılığı
 */
function calculateCoherence(prefeel: QuickFeel[], fixed: FixedFreqItem[]): number {
  if (prefeel.length === 0 || fixed.length === 0) return 50; // Nötr

  let matchCount = 0;
  let totalComparisons = 0;

  // Prefeel frekansları ile fixed'deki eşleşmeleri kontrol et
  for (const pf of prefeel) {
    const matchingFixed = fixed.find(f => f.f === pf.f);
    if (matchingFixed) {
      totalComparisons++;
      
      // Valence eşleşmesi kontrol et
      if (pf.feel === matchingFixed.valence) {
        matchCount++;
      }
    }
  }

  if (totalComparisons === 0) return 50;

  // Eşleşme oranını 0-100'e çevir
  const coherence = (matchCount / totalComparisons) * 100;
  
  return coherence;
}

/**
 * Valence hesaplama: iyi vs zor his oranı
 */
function calculateValence(fixed: FixedFreqItem[]): number {
  if (fixed.length === 0) return 0;

  let positiveCount = 0;
  let negativeCount = 0;

  // Yeni FeelType kategorilerine göre güncellendi
  const positiveFeel = ['bliss', 'joy', 'peace', 'love', 'energy', 'clarity', 'warmth', 'expansion'];
  const negativeFeel = ['tension', 'anxiety', 'sadness', 'anger', 'confusion', 'heaviness', 'restless', 'empty'];

  for (const f of fixed) {
    if (positiveFeel.includes(f.valence)) {
      positiveCount++;
    } else if (negativeFeel.includes(f.valence)) {
      negativeCount++;
    }
    // neutral, curious, focused, grounded sayılmaz
  }

  const total = positiveCount + negativeCount;
  if (total === 0) return 0;

  // -1 (tümü zor) ile +1 (tümü iyi) arasında
  const valence = (positiveCount - negativeCount) / total;
  
  return valence;
}

/**
 * Nefes anahtar frekansı (Hz) – BPM'den oktav kaydırma ile audible banda eşle
 */
function getBreathKeyHz(breath: BreathData | null): number {
  if (!breath || !isFinite(breath.bpm) || breath.bpm <= 0) return 432;
  const base = breath.bpm / 60; // breaths per second
  const k = Math.round(Math.log2(432 / base));
  const key = base * Math.pow(2, k);
  return Math.max(40, Math.min(8000, key));
}

/**
 * Fixed frekanslar ile nefes-anahtarı uyumu (0-100)
 * Semiton mod12 yakınlığı ve like değerleri ile ağırlıklandırma
 */
function calculateBreathAlignment(fixed: FixedFreqItem[], breath: BreathData | null): number {
  if (!breath || fixed.length === 0) return 50; // nötr

  const keyHz = getBreathKeyHz(breath);

  let weighted = 0;
  let weightSum = 0;

  for (const item of fixed) {
    const f = item.f;
    // semiton farkı (mod 12) → [0..6]
    let s = 12 * Math.log2(f / keyHz);
    s = Math.abs(((s + 6) % 12) - 6);
    const closeness = 1 - (s / 6); // 1 yakın, 0 uzak
    const w = Math.max(0, Math.min(1, item.like / 100));
    weighted += w * closeness;
    weightSum += w;
  }

  if (weightSum === 0) return 50;
  const alignment01 = weighted / weightSum; // 0..1

  // Oran bazlı bias: parasempatik (exhale>inhale) sakin seti destekler
  const ei = breath.exhaleAvg / Math.max(1, breath.inhaleAvg);
  const bias = ei > 1.1 ? 0.05 : ei < 0.9 ? -0.05 : 0; // küçük bias

  return Math.max(0, Math.min(100, (alignment01 + bias) * 100));
}

/**
 * Efsane gate kontrolü (160-170 için)
 */
function checkLegendaryGate(
  session: Partial<Session>,
  F_freq: number,
  Chrono: number,
  Stability: number,
  Tone: number,
  Breath: number
): boolean {
  // Temel koşullar
  const selectivity = calculateSelectivity(session.fixed || []);
  const coherence = calculateCoherence(session.prefeel || [], session.fixed || []);
  
  if (selectivity < 85 || coherence < 85) return false;
  if (Breath < 85 || Chrono < 90 || Stability < 85) return false;

  // Negatif valence kontrolü
  const negativeRatio = calculateNegativeRatio(session.fixed || []);
  if (negativeRatio > 0.1) return false; // %10'dan fazla zor his

  // Tutarlılık kontrolü (tekrar ölçümler varsa)
  // Bu basit implementasyonda skip ediyoruz

  return true;
}

/**
 * Zor his oranını hesapla
 */
function calculateNegativeRatio(fixed: FixedFreqItem[]): number {
  if (fixed.length === 0) return 0;
  
  // Zor his FeelType değerleri
  const negativeFeel = ['tension', 'anxiety', 'sadness', 'anger', 'confusion', 'heaviness', 'restless', 'empty'];
  const negativeCount = fixed.filter(f => negativeFeel.includes(f.valence)).length;
  return negativeCount / fixed.length;
}

/**
 * FQI'ya göre yüzdelik hesaplama
 */
function calculatePercentile(fqi: number): number {
  // Basit model: FQI 100 = 50. yüzdelik
  // Normal dağılım varsayımıyla
  if (fqi <= 40) return 1;
  if (fqi >= 170) return 99;
  
  // Linear interpolation for simplicity
  const normalizedFQI = (fqi - 100) / 15; // Z-score yaklaşımı
  const percentile = Math.max(1, Math.min(99, 50 + normalizedFQI * 20));
  
  return Math.round(percentile);
}

/**
 * Aura tipi ataması
 */
export function assignAuraType(session: Partial<Session>): AuraInfo {
  const tone = session.tone;
  const fixed = session.fixed || [];
  const breath = session.breath;
  
  if (!tone || fixed.length === 0) {
    return { type: 'Aether' }; // Default
  }

  // Ton vektörü
  const [energy, saturation, texture] = tone.vec;
  
  // Body locus dağılımı - yeni tipleri gruplandır
  const bodyCount = {
    upper: 0,    // crown, forehead, eyes, ears, throat
    middle: 0,   // heart, chest, solar_plexus, arms, hands  
    lower: 0,    // belly, sacral, legs, feet, spine
    general: 0   // full_body, aura_field, no_sensation
  };
  
  for (const f of fixed) {
    // Map new body types to categories
    const upperBodies = ['crown', 'forehead', 'eyes', 'ears', 'throat'];
    const middleBodies = ['heart', 'chest', 'solar_plexus', 'arms', 'hands'];
    const lowerBodies = ['belly', 'sacral', 'legs', 'feet', 'spine'];
    const generalBodies = ['full_body', 'aura_field', 'no_sensation'];
    
    // Handle multiple body selections
    for (const locus of f.locus) {
      if (upperBodies.includes(locus)) bodyCount.upper++;
      else if (middleBodies.includes(locus)) bodyCount.middle++;
      else if (lowerBodies.includes(locus)) bodyCount.lower++;
      else if (generalBodies.includes(locus)) bodyCount.general++;
    }
  }
  
  // Valence profili - yeni tipleri gruplandır
  const valenceCount = {
    positive: 0,  // bliss, joy, peace, love, energy, clarity, warmth, expansion
    neutral: 0,   // neutral, curious, focused, grounded
    negative: 0   // tension, anxiety, sadness, anger, confusion, heaviness, restless, empty
  };
  
  for (const f of fixed) {
    // Map new feel types to categories
    const positiveFeel = ['bliss', 'joy', 'peace', 'love', 'energy', 'clarity', 'warmth', 'expansion'];
    const neutralFeel = ['neutral', 'curious', 'focused', 'grounded'];
    const negativeFeel = ['tension', 'anxiety', 'sadness', 'anger', 'confusion', 'heaviness', 'restless', 'empty'];
    
    if (positiveFeel.includes(f.valence)) valenceCount.positive++;
    else if (neutralFeel.includes(f.valence)) valenceCount.neutral++;
    else if (negativeFeel.includes(f.valence)) valenceCount.negative++;
  }

  // Sabit centroid'ler ile kosinüs benzerliği - yeni sistem bazlı
  const centroids: Record<AuraType, { tone: [number, number, number], body: string, valence: string }> = {
    'Solar': { 
      tone: [1, 1, 1], // sıcak, canlı, keskin
      body: 'middle', // kalp-güneş ağı çakraları
      valence: 'positive' // enerji, genişleme
    },
    'Lunar': { 
      tone: [-1, -1, -1], // soğuk, pastel, akışkan
      body: 'upper', // üst çakralar, sezgisel
      valence: 'positive' // huzur, berraklık
    },
    'Aether': { 
      tone: [0, 1, -1], // yüksek, akışkan
      body: 'upper', // sinir sistemi, üst çakralar
      valence: 'neutral' // odaklanma, merak
    },
    'Terra': { 
      tone: [0, 0, 0], // dengeli, topraklı
      body: 'lower', // alt çakralar, fiziksel
      valence: 'positive' // topraklanma, ısınma
    },
    'Quasar': { 
      tone: [1, 1, 1], // kontrast, keskin
      body: 'upper', // sinir sistemi, yüksek frekanslı
      valence: 'positive' // elektriklenme, zihin açılması
    },
    'Zephyr': { 
      tone: [-1, 0, -1], // akışkan, hafif
      body: 'general', // aura alanları, tüm beden
      valence: 'neutral' // dinginlik, odaklanma
    }
  };

  // En yüksek body locus
  const dominantBody = Object.entries(bodyCount).reduce((a, b) => 
    bodyCount[a[0] as keyof typeof bodyCount] > bodyCount[b[0] as keyof typeof bodyCount] ? a : b
  )[0];

  // En yüksek valence
  const dominantValence = Object.entries(valenceCount).reduce((a, b) => 
    valenceCount[a[0] as keyof typeof valenceCount] > valenceCount[b[0] as keyof typeof valenceCount] ? a : b
  )[0];

  // Kosinüs benzerliği + nefes modülasyonu
  let bestMatch: AuraType = 'Aether';
  let bestScore = -1;

  for (const [auraType, centroid] of Object.entries(centroids)) {
    // Ton vektörü benzerliği
    const dotProduct = energy * centroid.tone[0] + saturation * centroid.tone[1] + texture * centroid.tone[2];
    const magnitude1 = Math.sqrt(energy ** 2 + saturation ** 2 + texture ** 2);
    const magnitude2 = Math.sqrt(centroid.tone[0] ** 2 + centroid.tone[1] ** 2 + centroid.tone[2] ** 2);
    
    let toneScore = 0;
    if (magnitude1 > 0 && magnitude2 > 0) {
      toneScore = dotProduct / (magnitude1 * magnitude2);
    }

    // Body match bonus
    const bodyScore = dominantBody === centroid.body ? 0.5 : 0;
    
    // Valence match bonus
    const valenceScore = dominantValence === centroid.valence ? 0.3 : 0;

    let totalScore = toneScore + bodyScore + valenceScore;

    // Breath-driven modulation
    if (breath) {
      // Resonance bias: 5.5 bpm yakınsa Lunar/Zephyr'e küçük bonus, çok hızlıysa Solar/Quasar'a
      const bpmDev = Math.abs((60000 / Math.max(1, (breath.inhaleAvg + breath.exhaleAvg) / 1)) / 1000 - 5.5);
      const resonanceBonus = Math.max(0, 0.2 - (bpmDev / 6));
      if ((auraType as AuraType) === 'Lunar' || (auraType as AuraType) === 'Zephyr') totalScore += resonanceBonus;
      if ((auraType as AuraType) === 'Solar' || (auraType as AuraType) === 'Quasar') totalScore += Math.max(0, (breath.bpm - 6) / 30);

      // Ratio bias: exhale>inhale (parasempatik) Terra/Lunar; inhale>exhale Solar/Quasar
      const ei = breath.exhaleAvg / Math.max(1, breath.inhaleAvg);
      if (ei > 1.1 && ((auraType as AuraType) === 'Terra' || (auraType as AuraType) === 'Lunar')) totalScore += 0.15;
      if (ei < 0.9 && ((auraType as AuraType) === 'Solar' || (auraType as AuraType) === 'Quasar')) totalScore += 0.15;
    }

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = auraType as AuraType;
    }
  }

  return { type: bestMatch };
}

/**
 * Aura tipi açıklamaları (nötr dil)
 */
export const AURA_DESCRIPTIONS: Record<AuraType, string> = {
  'Solar': 'Güçlü enerji, sıcak hisler, doğal liderlik.',
  'Lunar': 'Sakin derinlik, güçlü sezgiler, akışkan yapı.',
  'Aether': 'Yüksek frekans, zihinsel berraklık, geniş bakış.',
  'Terra': 'Dengeli güç, stabil enerji, doğal denge.',
  'Quasar': 'Yoğun titreşim, yaratıcı enerji, dönüşüm gücü.',
  'Zephyr': 'Hafif akış, esnek uyum, özgür ruh.'
};

/**
 * Aura + Nefes birleşik kısa anlatım
 */
export function buildAuraNarrative(aura: AuraInfo, session: Partial<Session>): string {
  const b = session.breath;
  const type = aura.type;
  const toneWord: Record<AuraType, string> = {
    'Solar': 'ateşli ve atılgan',
    'Lunar': 'akışkan ve sezgisel',
    'Aether': 'zihinsel ve vizyoner',
    'Terra': 'topraklı ve merkezli',
    'Quasar': 'dönüştürücü ve kuvvetli',
    'Zephyr': 'hafif ve özgür'
  };
  if (!b) return `${type} doğası ${toneWord[type]} bir imza taşır.`;

  const bpm = b.bpm;
  const bpmDesc = bpm <= 6 ? 'dingin' : bpm <= 10 ? 'dengeli' : 'yüksek';
  const ei = b.exhaleAvg / Math.max(1, b.inhaleAvg);
  const ratioDesc = ei > 1.1 ? 'verişi uzun' : ei < 0.9 ? 'alışı uzun' : 'alış‑verişi dengeli';
  const cvDesc = b.cv < 0.12 ? 'tutarlılığı yüksek' : b.cv > 0.25 ? 'değişken ve yaratıcı' : 'esnek';

  return `${type} doğası ${toneWord[type]}; ${bpmDesc} ritim ve ${ratioDesc}, ${cvDesc} bir nefesle birleşiyor.`;
}
