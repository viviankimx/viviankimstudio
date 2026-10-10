import type { NextConfig } from 'next';

// Static export: every page is prerendered from content/ at build time.
const nextConfig: NextConfig = { output: 'export' };

export default nextConfig;
