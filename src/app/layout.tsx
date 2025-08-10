import { GoogleAnalytics } from '@next/third-parties/google'
import { GA_MEASUREMENT_ID } from './gtag';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Snap3',
    default: 'Snap3 - AI-Powered Video Content Analysis',
  },
  description: 'Professional video content analysis and export platform with VDP evidence processing, QA validation, and secure embed handling.',
  keywords: ['video analysis', 'content creation', 'AI', 'VDP', 'evidence', 'quality assurance'],
  authors: [{ name: 'Snap3 Team' }],
  creator: 'Snap3',
  publisher: 'Snap3',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://snap3.dev',
    siteName: 'Snap3',
    title: 'Snap3 - AI-Powered Video Content Analysis',
    description: 'Professional video content analysis and export platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snap3 - AI-Powered Video Content Analysis',
    description: 'Professional video content analysis and export platform',
    creator: '@snap3dev',
  },
  verification: {
    google: 'google-site-verification-token',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Google Analytics */}
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
