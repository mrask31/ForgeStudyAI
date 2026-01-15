import { Suspense } from 'react'
import ClientCallback from './ClientCallback'

export default function ClientAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">
              Finishing verification...
            </h1>
            <p className="text-sm text-slate-600">
              One moment while we complete your signup.
            </p>
          </div>
        </div>
      }
    >
      <ClientCallback />
    </Suspense>
  )
}
