import './globals.css'
import type { Metadata } from 'next'
import { Saira, Audiowide } from 'next/font/google'
import { Providers } from '../components/providers'
import { ErrorBoundary } from '../components/error-boundary'
import { ClientOnly } from '../components/client-only'

// Force all pages to be dynamic - prevent static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0

const saira = Saira({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-saira',
  display: 'swap',
})

const audiowide = Audiowide({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-audiowide',
  display: 'swap',
})

export const metadata = {
  title: 'Rise as One - Basketball Program Manager',
  description: 'Comprehensive parent payment and communication management system for Rise as One Basketball Program',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${saira.variable} ${audiowide.variable} font-saira`} suppressHydrationWarning>
        <ErrorBoundary>
          <ClientOnly
            fallback={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }
          >
            <Providers>
              {children}
            </Providers>
          </ClientOnly>
        </ErrorBoundary>
      </body>
    </html>
  )
}
