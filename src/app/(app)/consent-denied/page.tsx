import { ShieldX } from 'lucide-react'
import Link from 'next/link'

export default function ConsentDeniedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center">
          <ShieldX className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Account not approved</h1>
        <p className="text-slate-400">
          Your parent has not approved this account. If you think this was a mistake, ask your parent to email{' '}
          <a href="mailto:support@forgestudyai.com" className="text-indigo-400 hover:text-indigo-300">support@forgestudyai.com</a>.
        </p>
        <Link href="/profiles" className="inline-block text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          Switch profile
        </Link>
      </div>
    </div>
  )
}
