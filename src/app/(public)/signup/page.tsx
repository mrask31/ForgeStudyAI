'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SignupClient from './SignupClient'
import FlowSignup from '@/components/signup/FlowSignup'

export const dynamic = 'force-dynamic'

function SignupRouter() {
  const searchParams = useSearchParams()
  const flow = searchParams.get('flow')

  if (flow === 'parent' || flow === 'student') {
    return <FlowSignup flow={flow} />
  }

  return <SignupClient />
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <SignupRouter />
    </Suspense>
  )
}
