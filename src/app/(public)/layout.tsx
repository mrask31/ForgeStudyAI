import type { Metadata } from 'next'
import PublicLayout from '@/components/layout/PublicLayout'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.forgestudyai.com'),
  title: 'ForgeStudy | AI Study Help for Grades 6–12',
  description:
    'ForgeStudy is an AI study companion for Grades 6–12 with study maps, practice, and exam prep. Built for families who want confident, independent learners.',
  alternates: {
    canonical: '/',
  },
  keywords: [
    'AI study help',
    'homework help',
    'study guide',
    'test prep',
    'middle school tutoring',
    'high school tutoring',
    'study maps',
    'practice questions',
    'exam prep',
    'Grades 6-12',
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'ForgeStudy | AI Study Help for Grades 6–12',
    description:
      'ForgeStudy is an AI study companion for Grades 6–12 with study maps, practice, and exam prep. Built for families who want confident, independent learners.',
    type: 'website',
    url: '/',
    images: [
      {
        url: '/Hero1.png',
        width: 1200,
        height: 630,
        alt: 'ForgeStudy study workflow preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ForgeStudy | AI Study Help for Grades 6–12',
    description:
      'ForgeStudy is an AI study companion for Grades 6–12 with study maps, practice, and exam prep.',
    images: ['/Hero1.png'],
  },
}

export default function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell variant="public">
      <PublicLayout>{children}</PublicLayout>
    </AppShell>
  )
}

