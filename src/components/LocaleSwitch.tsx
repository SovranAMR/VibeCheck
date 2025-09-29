'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function LocaleSwitch() {
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (locale: 'tr' | 'en') => {
    if (!pathname) return;
    const parts = pathname.split('/');
    const current = parts[1];
    const locales = ['tr','en'];
    if (locales.includes(current)) {
      parts[1] = locale;
      router.push(parts.join('/') || '/');
    } else {
      router.push(`/${locale}${pathname === '/' ? '' : pathname}`);
    }
  };

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 text-xs">
      <button onClick={() => switchTo('tr')} className="px-2 py-1 rounded bg-slate-800/70 text-white hover:bg-slate-700">TR</button>
      <button onClick={() => switchTo('en')} className="px-2 py-1 rounded bg-slate-800/70 text-white hover:bg-slate-700">EN</button>
    </div>
  );
}



