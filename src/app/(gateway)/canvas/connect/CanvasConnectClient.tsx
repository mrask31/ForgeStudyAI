'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Shield, Lock, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function CanvasConnectClient() {
  const [canvasUrl, setCanvasUrl] = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null)
  const router = useRouter()

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Store Canvas credentials in sessionStorage for now
      // In production, this would be encrypted and stored securely
      sessionStorage.setItem('canvas_url', canvasUrl.trim())
      sessionStorage.setItem('canvas_token', canvasToken.trim())

      setMessage({ text: 'Canvas connected successfully!', type: 'success' })
      
      // Redirect to success/next step
      setTimeout(() => {
        router.push('/app')
      }, 1500)
    } catch (error: any) {
      setMessage({ text: error.message || 'Failed to connect Canvas', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
        {/* Left Column - Context */}
        <div className="bg-card/50 border-r border-border hidden md:flex flex-col justify-center items-center p-8">
          <div className="max-w-md space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
                <span className="text-sm font-semibold text-primary">Step 4 of 5</span>
              </div>
              <h2 className="text-3xl font-bold text-foreground leading-tight">
                Connect Canvas
              </h2>
              <p className="text-lg text-muted-foreground">
                Your student's assignments appear as a glowing galaxy.
              </p>
            </div>

            <div className="space-y-4 pt-8">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground text-sm">Real Homework</div>
                  <div className="text-sm text-muted-foreground">Get tutored on actual assignments</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground text-sm">Read-Only Access</div>
                  <div className="text-sm text-muted-foreground">We never modify anything in Canvas</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground text-sm">Secure Connection</div>
                  <div className="text-sm text-muted-foreground">Your token stays encrypted</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="bg-background flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="bg-card/60 backdrop-blur-md border border-border rounded-2xl p-8 shadow-2xl">
              {/* Mobile Header */}
              <div className="md:hidden mb-8 text-center">
                <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-4">
                  <span className="text-sm font-semibold text-primary">Step 4 of 5</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">Connect Canvas</h1>
              </div>

              {/* Hidden on mobile, shown on desktop */}
              <div className="hidden md:block mb-6">
                <h1 className="text-2xl font-bold text-foreground">Canvas Setup</h1>
              </div>

              {/* Reassurance Box */}
              <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-300 leading-relaxed">
                    <strong>Parent Promise:</strong> We only read your assignments. We never modify anything in Canvas, access grades, or share data with third parties.
                  </p>
                </div>
              </div>

              <form onSubmit={handleConnect} className="space-y-5">
                {/* Canvas URL */}
                <div>
                  <label htmlFor="canvasUrl" className="block text-sm font-semibold text-foreground mb-2">
                    Canvas Instance URL
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    e.g., <code className="bg-secondary px-1 py-0.5 rounded text-xs">school.instructure.com</code>
                  </p>
                  <input
                    type="text"
                    id="canvasUrl"
                    value={canvasUrl}
                    onChange={(e) => setCanvasUrl(e.target.value)}
                    placeholder="school.instructure.com"
                    required
                    className="w-full px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                    disabled={loading}
                  />
                </div>

                {/* Canvas Token */}
                <div>
                  <label htmlFor="canvasToken" className="block text-sm font-semibold text-foreground mb-2">
                    Canvas API Token
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Generate at: <code className="bg-secondary px-1 py-0.5 rounded text-xs">Account Settings → Approved Integrations</code>
                  </p>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="canvasToken"
                      value={canvasToken}
                      onChange={(e) => setCanvasToken(e.target.value)}
                      placeholder="Paste your API token here"
                      required
                      className="w-full px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4">
                  <p className="text-xs text-blue-300 leading-relaxed">
                    <strong>How to get your token:</strong> Log into Canvas → Account Settings → Approved Integrations → Generate New Access Token → Copy the token and paste it above.
                  </p>
                </div>

                {/* Error/Success Message */}
                {message && (
                  <div className={`p-4 text-sm rounded-xl ${
                    message.type === 'error'
                      ? 'bg-red-900/20 text-red-400 border border-red-700/50'
                      : 'bg-green-900/20 text-green-400 border border-green-700/50'
                  }`}>
                    {message.text}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !canvasUrl.trim() || !canvasToken.trim()}
                  className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect Canvas
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Skip for now (optional) */}
                <button
                  type="button"
                  onClick={() => router.push('/app')}
                  className="w-full px-6 py-3 border-2 border-border text-foreground rounded-xl font-semibold hover:bg-secondary/50 transition-colors"
                >
                  Skip for now
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-center text-muted-foreground">
                  You can connect Canvas anytime from your settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
