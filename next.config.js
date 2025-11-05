const withNextIntl = require('next-intl/plugin')('./app/i18n.ts');

const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    buildExcludes: [/middleware-manifest\.json$/]
})

/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            'osx-temperature-sensor': false,
        };
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

module.exports = withNextIntl({
    ...withPWA(nextConfig)
});
