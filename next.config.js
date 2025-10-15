/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Handle Paper.js which has issues with SSR
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        jsdom: false,
      };
    }

    // Exclude Paper.js from server-side bundle
    if (isServer) {
      config.externals = [...(config.externals || []), 'paper', 'canvas', 'jsdom'];
    }

    return config;
  },
};

module.exports = nextConfig;

