/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Excalidraw uses browser-only APIs — must be transpiled client-side only
  transpilePackages: ["@excalidraw/excalidraw"],
  webpack: (config) => {
    // Suppress Excalidraw's optional peer dep warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    }
    return config
  },
  turbopack: {},
}

export default nextConfig
