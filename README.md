# Frekans Aura Testi - MVP

Ses titreşimleriyle kişisel rezonans imzanı keşfet. Dakikalar içinde benzersiz frekans profilini ortaya çıkar.

## 🎯 Özellikler

### ✅ Tamamlanan Modüller

- **Landing Page** - Sade ve mistik giriş
- **AudioContext Unlock** - iOS Safari uyumlu ses sistemi
- **Kalibrasyon** - Ses seviyesi + 432Hz ilk deneyim  
- **İlk Deneyim** - 3 frekans spontan tepki (528/220/40 Hz)
- **Ana Frekans Testi** - 8 sabit frekans (40-8000 Hz)
- **Serbest Seçim** - Logaritmik slider ile kişisel frekans
- **Zaman Algısı** - 3 deneme ile iç saat hassasiyeti
- **Mikro-Stabilite** - 30sn motor kontrol testi
- **Ton Tercihi** - 8 çift sezgisel kart seçimi
- **Nefes Koheransı** - 4 döngü nefes ritmi
- **Skor Motoru** - Deterministik FQI hesaplama (40-170)
- **Sonuçlar** - Ücretsiz çıkış + paywall

### 🎨 Teknik Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **State**: Zustand (session + audio engine)
- **Audio**: WebAudio API (OscillatorNode + GainNode)
- **Responsive**: Mobil ve desktop uyumlu

## 🚀 Kurulum

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

## 📊 Test Akışı

1. **/** - Landing (mistik tasarım)
2. **/start** - Audio unlock + onboarding  
3. **/calibration** - Ses ayarı + 432Hz deneyimi
4. **/prefeel** - 3 frekans (528/220/40 Hz)
5. **/freq/main** - 8 sabit frekans profili
6. **/freq/freepick** - Logaritmik slider (40-8000 Hz)
7. **/chrono** - Zaman algısı (3x 10sn)
8. **/stability** - Mikro-sway (30sn)
9. **/tone** - Tonal kartlar (8 çift, 2sn limit)
10. **/breath** - Nefes koheransı (4 döngü)
11. **/results** - FQI + Aura + paywall

## 🎵 Audio Özellikleri

- **Click-free**: 10ms fade-in/out
- **iOS Uyumlu**: Touch unlock sistemi
- **Logaritmik**: 40-8000 Hz aralığı
- **Real-time**: Canlı frekans değişimi (freepick)

## 📈 Skorlama Sistemi

### FQI (40-170)
- **F_freq** (40%): Selectivity + Coherence + Valence
- **Chrono** (15%): MAPE tabanlı zaman hassasiyeti  
- **Stability** (10%): RMS tabanlı motor kontrol
- **Tone** (15%): Vektör gücü + hız bonusu
- **Breath** (20%): CV tabanlı koherans + optimum bonus

### Efsane Gate (160-170)
- Selectivity ≥ 85, Coherence ≥ 85
- Breath ≥ 85, Chrono ≥ 90, Stability ≥ 85  
- Negatif valence ≤ %10

### 6 Aura Tipi
- **Solar**: Güçlü enerji, sıcak rezonans
- **Lunar**: Sakin derinlik, sezgisel güç
- **Aether**: Yüksek frekans, zihinsel berraklık
- **Terra**: Topraklı güç, stabil enerji
- **Quasar**: Yoğun titreşim, yaratıcı patlama
- **Zephyr**: Hafif akış, esnek uyum

## 🛡️ Anti-Cheat

- RT < 120ms spam koruması
- Sürekli 100 puan like spam tespiti
- Stability hareket kontrolü
- Nefes minimum süre validasyonu
- Frekans tutarlılık kontrolü

## 📱 Responsive

- **Desktop**: Mouse + klavye desteği
- **Mobile**: Touch + gesture uyumlu
- **Cross-browser**: Chrome, Safari, Firefox

## 🎯 Tamamlanan Ek Özellikler

- [x] ₺19 Detaylı analiz sayfası (/pay/basic)
- [x] ₺99 PDF + AI Sigil + MP3 (/pay/full)
- [x] PostHog analytics entegrasyonu
- [x] PWA optimizasyonu (manifest.json)
- [x] Hata yönetimi (error.tsx, not-found.tsx)
- [x] Performance optimizasyonları (loading states)

## 🚀 Sonraki Adımlar

- [ ] Gerçek ödeme entegrasyonu (İyzico/Stripe)
- [ ] PDF üretimi (Puppeteer/pdf-lib)
- [ ] AI Sigil üretimi (OpenAI DALL-E)
- [ ] MP3 ses dosyası üretimi
- [ ] Canlı deployment (Vercel)

## 📄 Lisans

MIT License - Kişisel ve ticari kullanım serbest.

---

*"Frekansını ölç, aurana bak." 🔮*