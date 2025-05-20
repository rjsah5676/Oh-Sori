import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpackDevMiddleware: (config: any) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*", // 클라이언트에서 /api/xxx 로 요청 시
        destination: "http://server:4000/:path*", // 서버(백엔드)로 전달
      },
    ];
  },
};

export default nextConfig;