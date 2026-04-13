import type { NextConfig } from "next"
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

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
      // /experts (e sub-rotas) em subdomínios → domínio principal
      {
        source: '/experts/:path*',
        has: [{ type: 'host', value: '(?<subdomain>[^.]+)\\.mynutri\\.pro' }],
        destination: 'https://mynutri.pro/experts/:path*',
        permanent: false,
      },
      {
        source: '/experts',
        has: [{ type: 'host', value: '(?<subdomain>[^.]+)\\.mynutri\\.pro' }],
        destination: 'https://mynutri.pro/experts',
        permanent: false,
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

export default withNextIntl(nextConfig)
