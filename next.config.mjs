/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from bundling server-only Node packages
  serverExternalPackages: ["cloudinary", "mongoose"],
  async rewrites() {
    // This looks at your .env file first. If it's not present, it falls back to Railway
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://agent-backend-dashboard-production.up.railway.app";
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

};

export default nextConfig;
