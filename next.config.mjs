/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['zustand']
  },
  outputFileTracingRoot: process.cwd(),
  i18n: {
    locales: ['tr', 'en'],
    defaultLocale: 'tr',
    localeDetection: true
  }
};

export default nextConfig;


