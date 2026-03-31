import { Clock } from 'lucide-react'
import Link from 'next/link'

export default function ConsentPendingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Waiting for parent approval</h1>
        <p className="text-slate-400">
          We sent an approval email to your parent. You'll be able to start studying as soon as they approve your account. Check back soon!
        </p>
        <Link href="/profiles" className="inline-block text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          Switch profile
        </Link>
      </div>
    </div>
  )
}
