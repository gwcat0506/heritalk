import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'www.khs.go.kr',
        pathname: '/unisearch/images/**',
      },
      {
        protocol: 'https',
        hostname: 'www.khs.go.kr',
        pathname: '/unisearch/images/**',
      },
    ],
  },
};

export default nextConfig;
