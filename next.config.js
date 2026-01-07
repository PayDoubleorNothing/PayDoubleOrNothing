/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Exclude Node.js modules from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
    }
    
    // Ignore specific packages that cause issues in client bundle
    config.externals = config.externals || []
    if (!isServer) {
      config.externals.push({
        'pino': 'commonjs pino',
        'pino-pretty': 'commonjs pino-pretty',
      })
    }
    
    return config
  },
}

module.exports = nextConfig
