import { getProcessedEmailTemplate } from '@/app/actions/email-templates'

interface EmailPreviewProps {
  searchParams: Promise<{ slug?: string; parentName?: string }> | { slug?: string; parentName?: string }
}

export default async function EmailPreviewPage({ searchParams }: EmailPreviewProps) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white border border-red-200 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Access Denied</h1>
          <p className="text-slate-600">
            This preview page is only available in development mode.
          </p>
        </div>
      </div>
    )
  }

  // Handle both Promise and direct object (for compatibility)
  const params = searchParams instanceof Promise ? await searchParams : searchParams
  const slug = params.slug || 'welcome-1'
  const parentName = params.parentName || null

  const template = await getProcessedEmailTemplate(slug, parentName)

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Dev Preview Only</strong> — This page is not available in production.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Email Template Preview</h1>

          {!template ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-medium text-red-800">
                Template with slug "{slug}" not found or not active.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Subject:
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-900">{template.subject}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Body:
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                    {template.body_markdown}
                  </pre>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">URL:</p>
                <code className="text-xs text-slate-600">
                  /dev/email-preview?slug={slug}&parentName={parentName || 'not-provided'}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
