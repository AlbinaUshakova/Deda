import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {import('next').NextConfig} */
const makeNextConfig = (phase) => ({
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  // Keep dev and production artifacts separate so `next build`
  // cannot corrupt a running `next dev` session.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
});

export default makeNextConfig;
