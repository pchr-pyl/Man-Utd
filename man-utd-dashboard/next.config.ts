import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  basePath: process.env.BASE_PATH || "",
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.BASE_PATH || "",
  },
  images: { unoptimized: true },
  trailingSlash: true,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
