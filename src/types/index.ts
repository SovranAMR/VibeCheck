// Temel veri tipleri
export type FeelType = 
  // İyi hisler
  | 'bliss' | 'joy' | 'peace' | 'love' | 'energy' | 'clarity' | 'warmth' | 'expansion'
  // Normal hisler
  | 'neutral' | 'curious' | 'focused' | 'grounded'
  // Zor hisler  
  | 'tension' | 'anxiety' | 'sadness' | 'anger' | 'confusion' | 'heaviness' | 'restless' | 'empty';

export type BodyLocusType = 
  // Baş ve boyun
  | 'crown' | 'forehead' | 'eyes' | 'ears' | 'throat'
  // Göğüs ve kollar
  | 'heart' | 'chest' | 'solar_plexus' | 'arms' | 'hands'
  // Karın ve bacaklar
  | 'belly' | 'sacral' | 'legs' | 'feet' | 'spine'
  // Genel alanlar
  | 'full_body' | 'aura_field' | 'no_sensation';
export type AuraType = 'Solar' | 'Lunar' | 'Aether' | 'Terra' | 'Quasar' | 'Zephyr';

// İlk deneyim verileri
export interface QuickFeel {
  f: number; // frekans
  feel: FeelType;
  body: BodyLocusType[]; // Multiple selection için array
}

// Sabit frekans ölçümleri
export interface FixedFreqItem {
  f: number;
  valence: FeelType;
  like: number; // 1-100 slider
  locus: BodyLocusType[]; // Multiple selection için array
}

// Serbest seçim
export interface FreePick {
  f: number;
  feel?: FeelType;
  body?: BodyLocusType[]; // Multiple selection için array
}

// Zaman algısı
export interface ChronoData {
  trials: number[]; // kullanıcının süreleri
  mape: number; // ortalama mutlak yüzde hata
  bias: number; // ortalama sapma (+ slow, - fast)
  score: number; // 0-100
}

// Mikro-sway stabilite
export interface StabilityData {
  rms: number; // root mean square sapma
  score: number; // 0-100
}

// Tonal/Arousal
export interface ToneData {
  vec: [number, number, number]; // Enerji, Doygunluk, Doku
  strength: number; // 0-100
  rtAvg: number; // ortalama reaksiyon süresi
  // Bilimsel türev metrikler (0-100)
  arousal?: number;        // enerji ekseni + hız
  novelty?: number;        // doygunluk/kontrast + kararlılık
  sensory?: number;        // doku (keskin-yumuşak) duyarlılığı
  decisiveness?: number;   // düşük entropi + düşük timeout
  impulsivity?: number;    // hızlı RT eğilimi (yüksek hızlı)
  // Bias ve kalite metrikleri
  biasWarmCold?: number;   // -1 (Soğuk) .. +1 (Sıcak)
  biasSharpSmooth?: number;// -1 (Akışkan/Yumuşak) .. +1 (Keskin)
  entropy?: number;        // 0..1 (seçim çeşitliliği)
  timeoutRate?: number;    // 0..1
}

// Nefes koheransı
export interface BreathData {
  inhaleAvg: number;
  exhaleAvg: number;
  ratio: number;
  cv: number; // coefficient of variation
  bpm: number; // breath per minute
  score: number; // 0-100
  deepInhaleAvg?: number;
  deepExhaleAvg?: number;
}

// Skorlar
export interface Scores {
  F_freq: number;
  Chrono: number;
  Stability: number;
  Tone: number;
  Breath: number;
  FQI: number; // 40-170
  percentile: number;
}

// Aura tipi
export interface AuraInfo {
  type: AuraType;
  secondary?: string;
}

// Ana session verisi
export interface Session {
  id: string;
  createdAt: number;
  prefeel: QuickFeel[]; // 4 kayıt
  fixed: FixedFreqItem[]; // 8 kayıt
  freepick: FreePick; // 1 kayıt
  chrono: ChronoData;
  stability: StabilityData;
  tone: ToneData;
  breath: BreathData;
  scores: Scores;
  aura: AuraInfo;
}

// Audio engine tipleri
export interface AudioEngine {
  ctx: AudioContext | null;
  master: GainNode | null;
  isUnlocked: boolean;
  makeTone: (fHz: number, durationSec: number, shape?: OscillatorType, easing?: boolean) => Promise<void>;
  unlock: () => Promise<void>;
  setMasterVolume: (gain: number) => void;
}

// UI state tipleri
export interface TestProgress {
  currentStep: string;
  completedSteps: string[];
  sessionData: Partial<Session>;
}
