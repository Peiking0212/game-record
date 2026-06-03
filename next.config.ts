import type { NextConfig } from "next";

/** Set GITHUB_PAGES=true when building for https://peiking0212.github.io/game-record/ */
const forGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  ...(forGithubPages
    ? {
        output: "export" as const,
        basePath: "/game-record",
        assetPrefix: "/game-record/",
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;