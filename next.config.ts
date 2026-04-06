import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/descubra/para-experts',
        destination: '/para-experts',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?<subdomain>[^.]+)\\.mynutri\\.pro" }],
        destination: "/:path*",
      },
    ]
  },
}

export default nextConfig
