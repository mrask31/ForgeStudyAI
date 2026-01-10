import PublicLayout from '@/components/layout/PublicLayout'
import { AppShell } from '@/components/layout/AppShell'

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

