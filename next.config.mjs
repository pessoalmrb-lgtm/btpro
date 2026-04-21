/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  experimental: {
    esmExternals: 'loose',
  },
  transpilePackages: ['lucide-react', 'framer-motion', 'canvas-confetti'],
};

export default nextConfig;
