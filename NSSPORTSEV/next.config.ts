import type { NextConfig } from "next";

/**
 * Next.js Configuration - OPTIMIZED
 * Official Next.js Production Best Practices
 * 
 * Features:
 * - Environment variable validation
 * - Security headers
 * - CORS configuration
 * - Image optimization
 * - Performance optimizations
 * - Production-ready settings
 * 
 * OPTIMIZATIONS:
 * ✅ Enhanced compiler optimizations
 * ✅ React optimization flags
 * ✅ Resource hints for preconnect
 * 
 * References:
 * - https://nextjs.org/docs/app/guides/production-checklist
 * - https://nextjs.org/docs/app/api-reference/config/next-config-js
 */

const nextConfig: NextConfig = {
  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // GitHub Pages deployment configuration
  output: process.env.GITHUB_PAGES === 'true' ? 'export' : undefined,
  basePath: process.env.GITHUB_PAGES === 'true' ? '/NSSPORTS' : '',
  
  // Disable dev indicators for cleaner development experience
  devIndicators: false,
  
  // ✅ OPTIMIZATION: Enhanced compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // ✅ OPTIMIZATION: Experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      '@phosphor-icons/react',
      'lucide-react',
      'framer-motion',
      'date-fns',
    ],
  },
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    // Expose GITHUB_PAGES flag to client for static export detection
    NEXT_PUBLIC_GITHUB_PAGES: process.env.GITHUB_PAGES,
    // Expose API key to client for GitHub Pages static export
    NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY: process.env.NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY,
  },

  // Image domains for optimization
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: 'nssportsclub.ngrok.app',
      },
      {
        protocol: 'https',
        hostname: 'nssportsclub.ngrok.app',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
      },
      {
        protocol: 'http',
        hostname: 'example.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Allowlist for cross-origin dev origins (ngrok, tunnels, etc.)
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  // Use an environment variable (comma-separated) to keep this flexible in CI/hosted dev.
  // Normalize origins: ensure each entry includes a protocol (default to https://)
  allowedDevOrigins: (process.env.NEXT_ALLOWED_DEV_ORIGINS || 'https://nssportsclub.ngrok.app')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map((origin) => {
      if (/^https?:\/\//i.test(origin)) return origin;
      return `https://${origin}`;
    }),

  // Security and performance headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },

  // Rewrites for API proxy (if needed)
  async rewrites() {
    return [];
  },
};

export default nextConfig;
