/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from bundling server-only Node packages
  serverExternalPackages: ["cloudinary", "mongoose"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://agent-backend-dashboard-production.up.railway.app/api/:path*',
      },
    ];
  },
};

export default nextConfig;
