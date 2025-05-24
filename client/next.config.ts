import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpackDevMiddleware: (config: any) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },

  images: {
    domains: ['ssl.pstatic.net', 'phinf.pstatic.net','lh3.googleusercontent.com','img1.kakaocdn.net'
      ,'ui-avatars.com'
    ],
  },

  async rewrites() {
    const isDocker = process.env.IS_DOCKER === 'true';

    return [
      {
        source: "/api/:path*",
        destination: isDocker
          ? "http://server:4000/:path*"
          : "http://localhost:4000/:path*",
      },
    ];
  },
};

export default nextConfig;