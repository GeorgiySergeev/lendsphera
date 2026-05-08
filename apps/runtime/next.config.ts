import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  transpilePackages: ["@workspace/ui", "@workspace/types", "@workspace/widgets"],
  webpack: (config) => {
    config.output.hashFunction = "sha256";
    return config;
  }
};

export default nextConfig;
