/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from bundling server-only Node packages (cloudinary, mongoose)
  serverExternalPackages: ["cloudinary", "mongoose"],
};

export default nextConfig;
