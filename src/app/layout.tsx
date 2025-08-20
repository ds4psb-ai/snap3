import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SummaryDock from '@/components/SummaryDock'
import CollaborationSummaryDock from '@/components/collaboration/SummaryDock'

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
  return (
    <html lang="ko">
      <body className={inter.className}>
        <SummaryDock />
        <CollaborationSummaryDock />
        <div className="pt-20">
          {children}
        </div>
      </body>
    </html>
  )
}
