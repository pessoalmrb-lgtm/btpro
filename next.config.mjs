/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  transpilePackages: ['lucide-react', 'framer-motion', 'canvas-confetti'],
};

export default nextConfig;
