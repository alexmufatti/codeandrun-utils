import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/dashboard/strava", destination: "/dashboard/settings", permanent: true },
      { source: "/dashboard/media", destination: "/dashboard/blog/media", permanent: true },
      { source: "/dashboard/posts/new", destination: "/dashboard/blog/posts/new", permanent: true },
    ];
  },
};

export default nextConfig;
