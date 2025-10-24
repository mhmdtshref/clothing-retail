/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Use webpack instead of Turbopack in dev if env var set
  },
  transpilePackages: ['@clerk/nextjs', '@clerk/shared'],
};

export default nextConfig;
