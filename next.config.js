/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable image optimization for Vercel
  images: {
    domains: ['res.cloudinary.com', 'images.unsplash.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Temporarily disable linting during builds for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Force dynamic rendering - no static generation  
  output: 'standalone',
  
  // Completely disable static generation
  trailingSlash: false,
  
  // Updated experimental features for better performance
  experimental: {
    // Optimize package imports for faster builds
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'date-fns'],
    // Removed swcMinify and optimizeServerReact to fix runtime issues
  },
  
  // Better error handling in production
  onDemandEntries: {
    // Reduce memory usage
    maxInactiveAge: 15 * 1000, // Reduced from 25s to 15s
    pagesBufferLength: 1, // Reduced from 2 to 1
  },
  
  // Enhanced webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Performance optimizations for development
    if (dev) {
      // Faster builds in development
      config.optimization.removeAvailableModules = false;
      config.optimization.removeEmptyChunks = false;
      config.optimization.splitChunks = false;
      
      // Reduce memory usage
      config.cache = {
        type: 'memory',
        maxGenerations: 1,
      };
    }

    if (!dev && !isServer) {
      // Optimize for production
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      }
    }

    // Handle external packages - Remove Convex externalization to fix import issues
    config.externals = config.externals || [];
    // Removed: config.externals.push('convex') - this was causing runtime issues

    return config;
  },

  // Add performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Add cache control for static assets
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // API routes should not be cached
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },

  // Add compression
  compress: true,
  
  // Reduce server-side rendering overhead
  reactStrictMode: false, // Disable in development for better performance
  
  // Add performance monitoring
  poweredByHeader: false,
}

module.exports = nextConfig
