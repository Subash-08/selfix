/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

const nextConfig = {
  turbopack: {}, // Suppresses Next.js 16 webpack/turbopack conflicts introduced by next-pwa
};

module.exports = withPWA(nextConfig);
