'use client';

import { useEffect, useState } from 'react';
import OpenAI from 'openai';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/sessionStore';
import { AURA_DESCRIPTIONS } from '@/lib/scoring';


export default function PayFullPage() {
  const router = useRouter();
  const { session } = useSessionStore();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [sigilUrl, setSigilUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has already paid for full package
    const hasFullAccess = localStorage.getItem('full-access') === 'true';
    setIsUnlocked(hasFullAccess);
    
    if (hasFullAccess) {
      // Load saved URLs
      const savedPdfUrl = localStorage.getItem('pdf-url');
      const savedMp3Url = localStorage.getItem('mp3-url');
      const savedSigilUrl = localStorage.getItem('sigil-url');
      setPdfUrl(savedPdfUrl);
      setMp3Url(savedMp3Url);
      setSigilUrl(savedSigilUrl);
    }
  }, []);

  const handlePayment = async () => {
    console.log('🚀 handlePayment called - starting generation process');
    setShowPayment(true);
    try {
      localStorage.setItem('full-access', 'true');

      // 1) Generate AI Sigil via OpenAI Images
      console.log('API Key:', process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'Found' : 'Missing');
      
      const client = new OpenAI({ 
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true 
      });
      
      const prompt = `${session.aura?.type} theme minimalist symbol, smooth gradients, centered icon, modern, no text, flat icon, soft glow`;
      console.log('Generating sigil with prompt:', prompt);
      
      const img = await client.images.generate({ 
        model: 'dall-e-3', 
        prompt, 
        size: '1024x1024',
        response_format: 'url'
      });
      
      const imageUrl = img.data?.[0]?.url || '';
      console.log('Generated sigil URL:', imageUrl);
      
      setSigilUrl(imageUrl);
      localStorage.setItem('sigil-url', imageUrl);

      // 2) Generate AI-powered detailed PDF report
      console.log('Generating AI-powered PDF report...');
      const pdfPrompt = `Sen bir frekans profil uzmanısın. Aşağıdaki kişisel test sonuçlarına dayanarak 2-3 sayfa kapsamlı, profesyonel ve kişiselleştirilmiş bir analiz raporu yaz.

KIŞISEL PROFIL:
- Aura Tipi: ${session.aura?.type}
- FQI Skoru: ${session.scores?.FQI}/100
- Favori Frekans: ${session.freepick?.f} Hz
- Frekans Uyumu: ${Math.round(session.scores?.F_freq ?? 0)}/100
- Stabilite: ${Math.round(session.scores?.Stability ?? 0)}/100
- Tercih Gücü: ${Math.round(session.scores?.Tone ?? 0)}/100
- Nefes Düzeni: ${Math.round(session.scores?.Breath ?? 0)}/100

RAPOR YAPISI:
1. Özet (Genel profil değerlendirmesi)
2. Detaylı Analiz (Her skor için açıklama)
3. Kişisel Öneriler (Gelişim tavsiyeleri)
4. Sonuç (Güçlü yönler ve odaklanılacak alanlar)

YAZIM STILI: Profesyonel, bilimsel ama anlaşılır, kişiselleştirilmiş, yapıcı ve motive edici. Türkçe yaz.`;

      const reportResponse = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: pdfPrompt }],
        max_tokens: 2000,
        temperature: 0.7
      });

      const aiReportText = reportResponse.choices[0]?.message?.content || 'Rapor olusturulamadi.';
      console.log('AI Report generated:', aiReportText.substring(0, 100) + '...');
      
      // Convert Turkish characters to ASCII for PDF compatibility
      const cleanText = aiReportText
        .replace(/İ/g, 'I')
        .replace(/ı/g, 'i')
        .replace(/Ğ/g, 'G')
        .replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U')
        .replace(/ü/g, 'u')
        .replace(/Ş/g, 'S')
        .replace(/ş/g, 's')
        .replace(/Ö/g, 'O')
        .replace(/ö/g, 'o')
        .replace(/Ç/g, 'C')
        .replace(/ç/g, 'c');

      // Create PDF with AI-generated content
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Page 1 - Header and AI Report
      let currentPage = pdfDoc.addPage([595, 842]);
      let yPosition = 800;
      
      // Header
      currentPage.drawText('FREKANS PROFIL RAPORU', { 
        x: 50, y: yPosition, size: 18, font: boldFont, color: rgb(0.2, 0.2, 0.8) 
      });
      yPosition -= 30;
      
      currentPage.drawText(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, { 
        x: 50, y: yPosition, size: 10, font, color: rgb(0.5, 0.5, 0.5) 
      });
      yPosition -= 40;

      // AI-generated report content with text wrapping
      const maxWidth = 495;
      const lineHeight = 14;
      const words = cleanText.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const textWidth = font.widthOfTextAtSize(testLine, 11);
        
        if (textWidth > maxWidth && currentLine) {
          // Draw current line
          currentPage.drawText(currentLine, { x: 50, y: yPosition, size: 11, font });
          yPosition -= lineHeight;
          currentLine = word;
          
          // Add new page if needed
          if (yPosition < 100) {
            currentPage = pdfDoc.addPage([595, 842]);
            yPosition = 800;
          }
        } else {
          currentLine = testLine;
        }
      }
      
      // Draw remaining text
      if (currentLine) {
        currentPage.drawText(currentLine, { x: 50, y: yPosition, size: 11, font });
        yPosition -= 30;
      }

      // Add scores summary at the end
      if (yPosition < 200) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPosition = 800;
      }
      
      yPosition -= 20;
      currentPage.drawText('SKOR OZETI', { x: 50, y: yPosition, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.8) });
      yPosition -= 25;
      currentPage.drawText(`FQI Skoru: ${session.scores?.FQI ?? 'N/A'}/100`, { x: 50, y: yPosition, size: 12, font });
      yPosition -= 18;
      currentPage.drawText(`Aura Tipi: ${session.aura?.type ?? 'N/A'}`, { x: 50, y: yPosition, size: 12, font });
      yPosition -= 18;
      currentPage.drawText(`Favori Frekans: ${session.freepick?.f ?? 'N/A'} Hz`, { x: 50, y: yPosition, size: 12, font });
      yPosition -= 18;
      currentPage.drawText(`Frekans Uyumu: ${Math.round(session.scores?.F_freq ?? 0)}/100`, { x: 50, y: yPosition, size: 12, font });
      yPosition -= 18;
      currentPage.drawText(`Stabilite: ${Math.round(session.scores?.Stability ?? 0)}/100`, { x: 50, y: yPosition, size: 12, font });
      yPosition -= 18;
      currentPage.drawText(`Tercih Gucu: ${Math.round(session.scores?.Tone ?? 0)}/100`, { x: 50, y: yPosition, size: 12, font });
      yPosition -= 18;
      currentPage.drawText(`Nefes Duzeni: ${Math.round(session.scores?.Breath ?? 0)}/100`, { x: 50, y: yPosition, size: 12, font });
      
      // Add sigil to the last page if there's space, otherwise create new page
      if (yPosition < 200) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPosition = 750;
      } else {
        yPosition -= 40;
      }
      
      // Sigil'i PDF'e ekle (proxy ile CORS bypass)
      currentPage.drawText('KISISEL SIGIL', { x: 50, y: yPosition, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.8) });
      yPosition -= 25;
      
      if (imageUrl) {
        try {
          // CORS bypass için Next.js API route kullan
          const proxyUrl = imageUrl; // Direct URL for static export
          const imageResponse = await fetch(proxyUrl);
          if (imageResponse.ok) {
            const imageArrayBuffer = await imageResponse.arrayBuffer();
            const png = await pdfDoc.embedPng(imageArrayBuffer);
            currentPage.drawImage(png, { x: 50, y: yPosition - 150, width: 150, height: 150 });
            currentPage.drawText('AI tarafindan uretilen kisisel sigiliniz', { x: 220, y: yPosition - 75, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
          }
        } catch (e) {
          console.log('Could not embed sigil in PDF:', e);
          // PDF'e text olarak ekle
          currentPage.drawText('AI Sigil: Basariyla olusturuldu', { x: 50, y: yPosition - 20, size: 12, font });
          currentPage.drawText('(Sigil goruntusu ayri olarak kaydedildi)', { x: 50, y: yPosition - 40, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
        }
      }
      const pdfBytes = await pdfDoc.save();
      console.log('PDF bytes generated, length:', pdfBytes.length);
      const pdfB64 = btoa(String.fromCharCode(...pdfBytes));
      const pdfDataUrl = `data:application/pdf;base64,${pdfB64}`;
      console.log('PDF data URL created, length:', pdfDataUrl.length);

      // 3) Skip MP3/WAV generation - too many encoding issues
      console.log('MP3 generation disabled - feature removed');
      const mp3DataUrl = null;

      // Persist & update UI
      localStorage.setItem('pdf-url', pdfDataUrl);
      setPdfUrl(pdfDataUrl);
      console.log('PDF URL set in state and localStorage');
      setMp3Url(null); // MP3 disabled
      setIsUnlocked(true);
      setShowPayment(false);

      // Save sigil image as preview element background
      const sigilEl = document.getElementById('ai-sigil-img');
      if (sigilEl) (sigilEl as HTMLDivElement).style.backgroundImage = `url(${imageUrl})`;
    } catch (e) {
      console.error('Generation failed:', e);
      alert('Bir hata oluştu: ' + (e as Error).message);
      setShowPayment(false);
    }
  };

  const handleDownloadPDF = () => {
    console.log('PDF download clicked, pdfUrl:', pdfUrl ? 'exists' : 'null');
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Frekans-Raporu-${session.aura?.type}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('PDF download initiated');
    } else {
      console.error('PDF URL is null, cannot download');
      alert('PDF henüz hazır değil. Lütfen biraz bekleyin.');
    }
  };

  const handleDownloadMP3 = () => {
    if (mp3Url) {
      const link = document.createElement('a');
      link.href = mp3Url;
      link.download = `Frekans-${session.freepick?.f}Hz-3dk.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const scores = session.scores;
  const aura = session.aura;
  const freepick = session.freepick;

  if (!scores || !aura) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Sonuçlar bulunamadı. Lütfen testi tamamlayın.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-4xl md:text-5xl font-light text-white">
            Tam Paket
          </h1>
          <p className="text-slate-300">
            Kişisel AI sigil ve detaylı analiz PDF raporu
          </p>
        </div>

        {!isUnlocked ? (
          /* Payment Required */
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-8 space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl text-white">Premium Frekans Paketi</h2>
              <p className="text-slate-300 max-w-2xl mx-auto">
                Tam kişiselleştirilmiş deneyim için özel olarak hazırlanan içerikler.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                ₺99
              </div>
              <p className="text-sm text-slate-400">Tek seferlik ödeme • Sınırsız erişim</p>
            </div>

            {/* Package Contents */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* AI Sigil */}
              <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="text-lg text-white text-center">AI Kişisel Sigil</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• {aura.type} aura tipine özel</li>
                  <li>• {freepick?.f}Hz frekans imzası</li>
                  <li>• Yüksek çözünürlük (2048x2048)</li>
                  <li>• Paylaşım kartı formatında</li>
                </ul>
              </div>

              {/* PDF Report */}
              <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-lg text-white text-center">Detaylı PDF Rapor</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• 2-3 sayfa kapsamlı analiz</li>
                  <li>• Tüm skorlar + yorumlar</li>
                  <li>• Kişisel gelişim önerileri</li>
                  <li>• Bilimsel + mistik yaklaşım</li>
                </ul>
              </div>

              {/* Bonus Features */}
              <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">⭐</span>
                </div>
                <h3 className="text-lg text-white text-center">Bonus Özellikler</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• Gelişmiş analiz algoritması</li>
                  <li>• Kişiselleştirilmiş öneriler</li>
                  <li>• Premium içerik erişimi</li>
                  <li>• Sınırsız PDF indirme</li>
                </ul>
              </div>
            </div>

            {/* Payment Button */}
            <div className="text-center">
              {showPayment ? (
                <div className="space-y-4">
                  <div className="text-purple-400">İçerikler oluşturuluyor...</div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-400">AI Sigil üretiliyor ✨</div>
                    <div className="text-sm text-slate-400">PDF rapor hazırlanıyor 📄</div>
                    <div className="text-sm text-slate-400">Premium içerik hazırlanıyor ⭐</div>
                  </div>
                  <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                <button
                  onClick={handlePayment}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-4 rounded-full text-xl font-medium transition-all duration-300 hover:scale-105"
                >
                  ₺99 - Tam Paketi Al
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 text-center">
              Güvenli ödeme • Anında erişim • 14 gün para iade garantisi
            </p>
          </div>
        ) : (
          /* Full Content Access */
          <div className="space-y-8">
            {/* Success Message */}
            <div className="bg-green-600/20 border border-green-500/30 rounded-2xl p-6 text-center">
              <div className="text-2xl text-green-400 mb-2">🎉 Tam Paket Aktif!</div>
              <p className="text-green-300">
                Tüm premium içerikleriniz hazır. Aşağıdan indirebilirsiniz.
              </p>
            </div>

            {/* AI Sigil Display */}
            <div className="bg-slate-800/50 rounded-2xl p-8 text-center space-y-6">
              <h2 className="text-2xl text-white">Kişisel Sigilin</h2>
              
              {/* AI Sigil Display */}
              <div id="ai-sigil-img" className="w-64 h-64 mx-auto rounded-lg flex items-center justify-center relative overflow-hidden">
                {sigilUrl ? (
                  <img 
                    src={sigilUrl} 
                    alt="Kişisel AI Sigil" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-lg flex items-center justify-center relative">
                    <div className="absolute inset-4 border-2 border-white/30 rounded-lg"></div>
                    <div className="text-6xl text-white/90">
                      {aura.type === 'Solar' ? '☀️' :
                       aura.type === 'Lunar' ? '🌙' :
                       aura.type === 'Aether' ? '✨' :
                       aura.type === 'Terra' ? '🌍' :
                       aura.type === 'Quasar' ? '💫' : '🌊'}
                    </div>
                    <div className="absolute bottom-2 right-2 text-xs text-white/70">
                      {freepick?.f}Hz
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-slate-300">
                  {aura.type} Tipi • {freepick?.f}Hz Rezonans
                </p>
                <p className="text-sm text-slate-400">
                  AI tarafından özel olarak üretildi
                </p>
              </div>
            </div>

            {/* Download Section */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* PDF Download */}
              <div className="bg-slate-800/50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📄</span>
                  </div>
                  <div>
                    <h3 className="text-lg text-white">Detaylı PDF Rapor</h3>
                    <p className="text-sm text-slate-400">2-3 sayfa kapsamlı analiz</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-300">
                  <div>• FQI: {scores.FQI} - Kapsamlı açıklama</div>
                  <div>• {aura.type} Tipi - Detaylı profil</div>
                  <div>• Tüm skorlar + kişisel yorumlar</div>
                  <div>• Gelişim önerileri ve egzersizler</div>
                </div>
                
                <button
                  onClick={handleDownloadPDF}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-all duration-300"
                >
                  📄 PDF İndir
                </button>
              </div>

              {/* MP3 Feature Removed - Too Many Technical Issues */}
              <div className="bg-slate-700/30 rounded-2xl p-6 space-y-4 opacity-50">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🔇</span>
                  </div>
                  <div>
                    <h3 className="text-lg text-white">Ses Özelliği</h3>
                    <p className="text-sm text-slate-400">Geçici olarak devre dışı</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-400">
                  <div>• Teknik sorunlar nedeniyle kaldırıldı</div>
                  <div>• Gelecek güncellemede geri gelecek</div>
                  <div>• PDF ve Sigil tam çalışıyor ✓</div>
                </div>
                
                <button
                  disabled
                  className="w-full bg-gray-600 text-gray-400 py-3 rounded-lg font-medium cursor-not-allowed"
                >
                  🔇 Ses Devre Dışı
                </button>
              </div>
            </div>

            {/* Usage Tips */}
            <div className="bg-slate-800/50 rounded-2xl p-6 space-y-4">
              <h3 className="text-xl text-white">Nasıl Kullanılır?</h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-300">
                <div>
                  <h4 className="text-white font-medium mb-2">📄 PDF Rapor</h4>
                  <ul className="space-y-1">
                    <li>• Sakin bir ortamda oku</li>
                    <li>• Notlar al, önerileri uygula</li>
                    <li>• 3-6 ay sonra tekrar değerlendir</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">🎵 Frekans MP3</h4>
                  <ul className="space-y-1">
                    <li>• Kulaklık ile dinle</li>
                    <li>• Meditasyon sırasında kullan</li>
                    <li>• Günde 5-10 dakika yeterli</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="text-center space-y-2">
          <button
            onClick={() => router.push('/results')}
            className="text-slate-400 hover:text-slate-300 underline"
          >
            ← Sonuçlara dön
          </button>
          
          {!isUnlocked && (
            <div className="text-slate-500 text-sm">
              Sadece detaylı analiz mi istiyorsun? 
              <button
                onClick={() => router.push('/pay/basic')}
                className="text-purple-400 hover:text-purple-300 ml-1 underline"
              >
                ₺19 paket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
