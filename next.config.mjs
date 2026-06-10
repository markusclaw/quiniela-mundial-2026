/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fully client-side app (no API routes / SSR) → export as static files.
  // Deploy the resulting `out/` folder to Cloudflare Pages (or any static host).
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
