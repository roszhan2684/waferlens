import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@waferlens/shared", "@waferlens/benchmark", "@waferlens/agent-tools"],
  poweredByHeader: false,
  turbopack: { root: path.join(__dirname, "../..") },
};

export default nextConfig;
