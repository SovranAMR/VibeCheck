export type Locale = 'tr' | 'en';

export const dictionaries: Record<Locale, Record<string, string>> = {
  tr: {
    app_title: 'Frekans Profil Testi',
    results_title: 'Frekans Profilin',
    results_sub: 'Kişisel frekans analizin tamamlandı',
    fqi_label: 'FQI (Frequency Quality Index)',
    aura_type: 'Aura Tipi',
    aura_index: 'Aura İndeksi',
    body_map: 'Vücut Haritası Analizi',
    personal_analysis: 'Kişisel Analiz',
    share: 'Sonucu Paylaş',
    email_results: 'Sonuçları Mail Olarak Al',
    tone_psy_title: 'Ses Tercihi Psikometrisi',
    tone_arousal_desc: 'Enerji ekseni + hızlı tepki (uyanıklık/atılım)',
    tone_novelty_desc: 'Doygunluk/kontrast ve kararlılık (yenilik arayışı)',
    tone_sensory_desc: 'Doku duyarlılığı (keskin ↔ yumuşak)',
    tone_decisiveness_desc: 'Düşük entropi + düşük timeout (karar netliği)',
    tone_impulsivity_desc: 'Hızlı tepki eğilimi (hazırcevaplık)',
    tone_note: 'Açıklamalar psikometri literatüründeki arousal/novelty/sensory karar eksenlerine dayalıdır; tepki süresi ve seçim çeşitliliği ile dengelenir.',
    cohesion_label: 'FQI ↔ Aura Bütünlüğü',
    cohesion_note: 'Frekans uyumu (F_freq), Tone vektörü ve beden/duygu dağılımının birbirini ne kadar desteklediğini gösterir. Yüksek değer, profilin bütünlüklü olduğunu ifade eder.'
  },
  en: {
    app_title: 'Frequency Profile Test',
    results_title: 'Your Frequency Profile',
    results_sub: 'Your personal frequency analysis is ready',
    fqi_label: 'FQI (Frequency Quality Index)',
    aura_type: 'Aura Type',
    aura_index: 'Aura Index',
    body_map: 'Body Map Analysis',
    personal_analysis: 'Personal Insights',
    share: 'Share Result',
    email_results: 'Get Results by Email',
    tone_psy_title: 'Tone Preference Psychometrics',
    tone_arousal_desc: 'Energy axis + fast response (arousal/activation)',
    tone_novelty_desc: 'Saturation/contrast and stability (novelty seeking)',
    tone_sensory_desc: 'Texture sensitivity (sharp ↔ smooth)',
    tone_decisiveness_desc: 'Low entropy + low timeout (decisiveness)',
    tone_impulsivity_desc: 'Fast response tendency (impulsivity/readiness)',
    tone_note: 'Descriptions are grounded in psychometric decision axes; balanced by reaction time and choice diversity.',
    cohesion_label: 'FQI ↔ Aura Cohesion',
    cohesion_note: 'Indicates how F_freq, Tone vector, and body/emotion distributions support each other. Higher is more coherent.'
  }
};

export function t(locale: Locale, key: string, fallback?: string) {
  return dictionaries[locale]?.[key] ?? fallback ?? key;
}



