/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  transpilePackages: ['lucide-react', 'motion', 'framer-motion', 'canvas-confetti'],
};

export default nextConfig;
