/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.nextbuild',
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
