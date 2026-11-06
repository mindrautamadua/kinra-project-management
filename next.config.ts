import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Mode dev memblokir resource /_next bila dibuka lewat 127.0.0.1 (bukan localhost); izinkan keduanya.
  allowedDevOrigins: ['127.0.0.1'],
  // Unggah foto kegiatan lewat server action: foto sudah diperkecil di browser (≤ ~1 MB), maksimal 10 per kirim.
  experimental: {
    serverActions: { bodySizeLimit: '15mb' },
    proxyClientMaxBodySize: '15mb',
  },
};

export default nextConfig;
