import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.wrike.com" },
      { protocol: "https", hostname: "s3.amazonaws.com" },
    ],
  },
};

export default nextConfig;
