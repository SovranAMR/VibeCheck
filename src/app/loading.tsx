import Loading from '@/components/Loading';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <Loading message="Sayfa yükleniyor..." size="lg" />
    </div>
  );
}
