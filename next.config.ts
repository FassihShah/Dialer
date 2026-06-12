import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { serverActions: { allowedOrigins: ['localhost:3000'] } },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, net: false, tls: false, fs: false };
    return config;
  },
};

export default nextConfig;
