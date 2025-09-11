'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, analytics } from '@/lib/analytics';

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize PostHog
    initAnalytics();
  }, []);

  useEffect(() => {
    // Track page views
    analytics.pageview(pathname);
  }, [pathname]);

  return <>{children}</>;
}
