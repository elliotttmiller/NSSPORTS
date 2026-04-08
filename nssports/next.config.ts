import type { NextConfig } from "next";

const BASE_PATH = '/NSSPORTS';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: BASE_PATH,
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  devIndicators: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  experimental: {
    optimizePackageImports: [
      '@phosphor-icons/react',
      'lucide-react',
      'framer-motion',
      'date-fns',
    ],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    // Expose the SportsGameOdds API key to the browser bundle.
    // The GitHub Actions workflow passes the GitHub secret as this env var.
    NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY: process.env.NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY,
    // Expose the basePath so client components can build correct absolute URLs.
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
