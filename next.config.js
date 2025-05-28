/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
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
        destination: `${process.env.BDNS_API_BASE_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;