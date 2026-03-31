import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ClientErrorHandler } from "@/components/ClientErrorHandler"
import { PostHogProvider } from "@/providers/PostHogProvider"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://mynutri.pro'),
  title: "MyNutri",
  description: "Assistente nutricional com IA customizada",
  verification: {
    google: 'Q0-9Pg-WhlhMPXQUKes4Nye2oFVWOiPUVrMKnevw7NA',
  },
  openGraph: {
    siteName: "MyNutri",
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${jakarta.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">
        <ClientErrorHandler />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
