import type { Metadata } from 'next'
import PublicLayout from '@/components/layout/PublicLayout'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'ForgeStudy | Study help for Grades 6–12',
  description:
    'ForgeStudy helps Grades 6–12 students map what to learn, practice with confidence, and prove mastery. Built for families and real learning.',
  openGraph: {
    title: 'ForgeStudy | Study help for Grades 6–12',
    description:
      'ForgeStudy helps Grades 6–12 students map what to learn, practice with confidence, and prove mastery. Built for families and real learning.',
    type: 'website',
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

