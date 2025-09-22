import type { NextConfig } from "next";
import path from "path";

// Load environment variables from parent directory
require('dotenv').config({ path: path.resolve('..', '.env.local') });

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(".."),
  },
};

export default nextConfig;
