/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['zustand']
  },
  outputFileTracingRoot: process.cwd()
};

export default nextConfig;


