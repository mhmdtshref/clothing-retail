/** @type {import('next').NextConfig} */
const urlStr = process.env.S3_PUBLIC_BASE_URL || 'https://example.com';
let url;
try { url = new URL(urlStr); } catch { url = new URL('https://example.com'); }

const nextConfig = {
  experimental: {
    // Use webpack instead of Turbopack in dev if env var set
  },
  transpilePackages: ['@clerk/nextjs', '@clerk/shared'],
  images: {
    remotePatterns: [
      {
        protocol: url.protocol.replace(':', ''),
        hostname: url.hostname,
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
