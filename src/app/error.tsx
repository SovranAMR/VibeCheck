'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="space-y-4">
          <div className="text-6xl">😔</div>
          <h1 className="text-2xl font-light text-white">
            Bir sorun oluştu
          </h1>
          <p className="text-slate-300">
            Beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyin.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-300"
          >
            Tekrar Dene
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-300"
          >
            Ana Sayfaya Dön
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Sorun devam ederse lütfen sayfayı yenileyin.
        </div>
      </div>
    </div>
  );
}
