'use client';

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SummaryDock from '@/components/SummaryDock'
import CollaborationSummaryDock from '@/components/collaboration/SummaryDock'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Snap3 VDP Platform',
  description: 'Video Data Package RAW Generation Pipeline',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 10 * 60 * 1000, // 10분
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
      }
    }
  }))

  return (
    <html lang="ko">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <SummaryDock />
          <CollaborationSummaryDock />
          <div className="pt-20">
            {children}
          </div>
        </QueryClientProvider>
      </body>
    </html>
  )
}
