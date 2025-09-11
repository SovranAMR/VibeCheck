import posthog from 'posthog-js';

// PostHog konfigürasyonu
export const initAnalytics = () => {
  if (typeof window !== 'undefined') {
    // Sadece production'da gerçek key kullan
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'ph-demo-key';
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
    
    posthog.init(apiKey, {
      api_host: apiHost,
      debug: process.env.NODE_ENV === 'development',
      capture_pageview: false, // Manuel sayfa görüntüleme takibi
      disable_session_recording: false,
    });
  }
};

// Analytics event tracking fonksiyonları
export const analytics = {
  // Temel eventler
  track: (event: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog.capture(event, properties);
    }
  },

  // Sayfa görüntüleme
  pageview: (path?: string) => {
    if (typeof window !== 'undefined') {
      posthog.capture('$pageview', {
        $current_url: path || window.location.pathname
      });
    }
  },

  // Test akışı eventleri
  testStart: () => {
    analytics.track('test_start');
  },

  calibrationDone: (level: number) => {
    analytics.track('calibration_done', { level });
  },

  prefeelAnswer: (f: number, feel: string, body: string) => {
    analytics.track('prefeel_answer', { f, feel, body });
  },

  fixedFreqAnswer: (f: number, like: number, valence: string, locus: string) => {
    analytics.track('fixedfreq_answer', { f, like, valence, locus });
  },

  freepickSelect: (f: number, feel: string, body: string) => {
    analytics.track('freepick_select', { f, feel, body });
  },

  chronoTrial: (t: number, err: number, bias: number) => {
    analytics.track('chrono_trial', { t, err, bias });
  },

  stabilityDone: (rms: number, stability: number) => {
    analytics.track('stability_done', { rms, stability });
  },

  toneTrial: (pair: string, choice: string, rt: number) => {
    analytics.track('tone_trial', { pair, choice, rt });
  },

  breathDone: (ratio: number, cv: number, bpm: number, breathScore: number) => {
    analytics.track('breath_done', { ratio, cv, bpm, breathScore });
  },

  fqiReady: (fqi: number, auraType: string) => {
    analytics.track('fqi_ready', { fqi, auraType });
  },

  // Ödeme eventleri
  payClick: (tier: 'basic' | 'full') => {
    analytics.track('pay_click', { tier });
  },

  paySuccess: (tier: 'basic' | 'full') => {
    analytics.track('pay_success', { tier });
  },

  pdfDownload: () => {
    analytics.track('pdf_download');
  },

  // Paylaşım
  shareClick: (platform?: string) => {
    analytics.track('share_click', { platform });
  },

  // Hata tracking
  error: (error: string, context?: Record<string, any>) => {
    analytics.track('error', { error, ...context });
  }
};
