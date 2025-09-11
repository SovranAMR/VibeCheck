import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="space-y-4">
          <div className="text-6xl">🔮</div>
          <h1 className="text-2xl font-light text-white">
            Sayfa Bulunamadı
          </h1>
          <p className="text-slate-300">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>
        </div>

        <div className="space-y-3">
          <Link 
            href="/"
            className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 text-center"
          >
            Ana Sayfaya Dön
          </Link>
          
          <Link 
            href="/results"
            className="block w-full bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 text-center"
          >
            Sonuçlarıma Git
          </Link>
        </div>

        <div className="text-xs text-slate-500">
          Frekans testini tamamladıysanız sonuçlar sayfanızdan devam edebilirsiniz.
        </div>
      </div>
    </div>
  );
}
