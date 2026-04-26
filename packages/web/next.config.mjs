/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  transpilePackages: ["@stinkit/shared"],
  experimental: {
    serverComponentsExternalPackages: ["tree-sitter", "tree-sitter-typescript", "tree-sitter-javascript", "sharp"],
  },
};

export default nextConfig;
