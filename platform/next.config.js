/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration for App Router only
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/claude-code', 'pg'],
  },
  env: {
    AUTH0_SECRET: process.env.AUTH0_SECRET,
    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL,
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  },
  images: {
    domains: ['s.gravatar.com', 'cdn.auth0.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        assert: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;