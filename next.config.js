const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/]
})

const withNextIntl = require('next-intl/plugin')('./app/i18n.ts')

const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: [],
    webpackBuildWorker: true
  },
  swcMinify: true,
  images: {
    unoptimized: true
  },
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'osx-temperature-sensor': false,
    };

    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
      };
    }

    return config;
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ]
  },
}

module.exports = withPWA(withNextIntl(nextConfig))
