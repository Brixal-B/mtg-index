/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export and basePath for production builds
  ...(process.env.NODE_ENV === 'production' && process.env.GITHUB_PAGES === 'true' ? {
    output: 'export',
    basePath: '/mtg-index',
    assetPrefix: '/mtg-index',
    trailingSlash: true,
    env: {
      NEXT_PUBLIC_STATIC_EXPORT: 'true',
    },
  } : {}),
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig

