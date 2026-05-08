import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  transpilePackages: ["@workspace/ui", "@workspace/types"]
};

export default nextConfig;
