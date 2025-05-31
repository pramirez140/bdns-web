/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  output: 'standalone',
  env: {
    BDNS_API_BASE_URL: process.env.BDNS_API_BASE_URL || 'https://www.infosubvenciones.es/bdnstrans',
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/bdns/:path*',
        destination: 'https://www.infosubvenciones.es/bdnstrans/:path*',
      },
    ];
  },
};

module.exports = nextConfig;