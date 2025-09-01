const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    buildExcludes: [/middleware-manifest\.json$/]
})

/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = withPWA(nextConfig)
