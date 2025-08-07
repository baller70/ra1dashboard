import './globals.css'
import type { Metadata } from 'next'
import { Saira } from 'next/font/google'
import { Providers } from '../components/providers'
import { ErrorBoundary } from '../components/error-boundary'

// Force all pages to be dynamic - prevent static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0

const saira = Saira({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-saira',
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
      <body className={`${saira.variable} font-saira`} suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
