/** @type {import('next').NextConfig} */
// Static export (output: "export") is only needed when building for hosting
// (Cloudflare Pages). It can break the local `next dev` server, so we apply it
// only for production builds. `next build` sets NODE_ENV=production.
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  ...(isProd ? { output: "export", trailingSlash: true } : {}),
};

export default nextConfig;
