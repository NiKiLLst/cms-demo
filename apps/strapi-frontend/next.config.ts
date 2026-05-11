import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output minimizes the runtime image — only what's needed for `node server.js`.
  output: "standalone",
};

export default nextConfig;
