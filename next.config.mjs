/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from bundling server-only Node packages
  serverExternalPackages: ["cloudinary", "mongoose"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
