import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';
const distDir = process.env.NEXT_DIST_DIR || (isDev ? '.next-dev' : '.next');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir,
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: '/health/:path*',
        destination: `${backendUrl}/health/:path*`,
      },
    ];
  },
};

export default nextConfig;
