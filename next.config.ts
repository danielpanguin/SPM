import type { NextConfig } from "next";
import path from "path";

// Load environment variables from current directory
require('dotenv').config({ path: path.resolve('.env.local') });

const nextConfig: NextConfig = {};

export default nextConfig;
