'use client';

import { useState } from 'react';
import { Mail, Copy, Check, Info } from 'lucide-react';

interface ForgeInboxBannerProps {
  inboxEmail: string | null;
  studentName: string;
}

export function ForgeInboxBanner({ inboxEmail, studentName }: ForgeInboxBannerProps) {
  const [copied, setCopied] = useState(false);

  if (!inboxEmail) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inboxEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 p-6 mb-8">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center">
          <Mail className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            📬 Forge Inbox for {studentName}
          </h3>
          <p className="text-sm text-slate-600 mb-3">
            Forward worksheets, assignments, or photos to this email address. We'll automatically add them to your materials.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-teal-200 px-4 py-2.5 flex-1 min-w-0">
              <code className="text-sm font-mono text-teal-700 truncate">
                {inboxEmail}
              </code>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Email
                </>
              )}
            </button>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Parents and teachers can email materials directly. Attachments (PDF, images) are automatically processed and added to your study materials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
