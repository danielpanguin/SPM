import type { NextConfig } from "next";
import path from "path";

// Load environment variables from current directory
require('dotenv').config({ path: path.resolve('.env.local') });

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Ignore source map warnings for node_modules
    config.ignoreWarnings = [
      { module: /node_modules/ }
    ];
    return config;
  },
  // Suppress source map warnings for Turbopack as well
  experimental: {
    turbo: {
      resolveAlias: {
        // Add any Turbopack-specific aliases if needed
      },
    }
  }
};

export default nextConfig;
