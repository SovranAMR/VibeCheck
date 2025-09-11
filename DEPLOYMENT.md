# 🚀 Deployment Rehberi

## Vercel Deployment (Önerilen)

### 1. Hızlı Deployment
```bash
# Vercel CLI yükle
npm i -g vercel

# Deploy et
vercel

# Production deployment
vercel --prod
```

### 2. GitHub Integration
1. GitHub'a push yap
2. [vercel.com](https://vercel.com) -> "Import Git Repository"
3. Bu repo'yu seç
4. Otomatik deployment başlar

### 3. Environment Variables (Opsiyonel)
Vercel dashboard'da şunları ekle:
```
NEXT_PUBLIC_POSTHOG_KEY=ph-your-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Netlify Deployment

```bash
# Build
npm run build

# Netlify CLI ile deploy
npm i -g netlify-cli
netlify deploy --prod --dir=.next
```

## Manuel Hosting

```bash
# Static export (opsiyonel)
npm run build

# .next klasörünü hosting'e yükle
# Apache/Nginx config gerekebilir
```

## Domain ve SSL

### Vercel
- Otomatik SSL
- Custom domain: Dashboard -> Domains

### Cloudflare (Opsiyonel)
- DNS yönetimi
- CDN hızlandırma
- Ekstra güvenlik

## Performance Monitoring

### 1. Vercel Analytics
```bash
npm install @vercel/analytics
```

### 2. PostHog Setup
- Dashboard'da proje oluştur
- API key'i environment variables'a ekle

## SEO Optimizasyonu

### robots.txt
```
User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap.xml
```

### sitemap.xml (Opsiyonel)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.com</loc>
    <priority>1.0</priority>
  </url>
</urlset>
```

## Production Checklist

- [x] Build başarılı (`npm run build`)
- [x] PWA manifest hazır
- [x] Analytics entegrasyonu
- [x] Error handling
- [x] Security headers
- [ ] Domain satın al
- [ ] SSL sertifikası (otomatik)
- [ ] Performance monitoring
- [ ] Gerçek ödeme sistemi (İyzico/Stripe)

## İletişim & Destek

Deployment sorunları için:
1. Vercel/Netlify documentation
2. Next.js deployment guides
3. Bu README.md'yi kontrol et

---

**🎉 Proje deployment'a hazır!**
