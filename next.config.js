/** @type {import('next').NextConfig} */

// Check if running in Electron build mode
const isElectronBuild = process.env.ELECTRON_BUILD === 'true'
const isDevelopment = process.env.NODE_ENV === 'development'

// Only use PWA wrapper for web builds (not Electron)
const withPWA = isElectronBuild
  ? (config) => config
  : require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: isDevelopment,
    })

const nextConfig = {
  // For Electron, we need static export
  ...(isElectronBuild && {
    output: 'export',
    distDir: 'out',
    // Disable image optimization for static export
    images: {
      unoptimized: true,
    },
  }),

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  // Environment variables
  env: {
    IS_ELECTRON: isElectronBuild ? 'true' : 'false',
  },

  webpack: (config, { isServer }) => {
    // Handle WebAssembly for sql.js (web build only)
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    })

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }

    // Fix for sql.js - disable Node.js modules in client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        // Additional fallbacks for Electron compatibility
        os: false,
        stream: false,
        buffer: false,
      }
    }

    // Electron-specific webpack configuration
    if (isElectronBuild) {
      // Mark Electron-only modules as external
      config.externals = [
        ...(config.externals || []),
        'electron',
        'better-sqlite3',
        'keytar',
      ]
    }

    return config
  },

  // Headers for development (not used in static export)
  async headers() {
    if (isElectronBuild) return []

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },

  // Rewrites for development (not used in static export)
  async rewrites() {
    if (isElectronBuild) return []

    return []
  },
}

module.exports = withPWA(nextConfig)
