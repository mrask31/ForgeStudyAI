'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB
const ACCEPTED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'text/plain'])
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.txt']

type DocStatus = 'processing' | 'ready' | 'error'

interface VaultDoc {
  filename: string
  created_at: string
  status: DocStatus
  errorMsg?: string
}

function FileIcon() {
  return (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function StatusBadge({ status, errorMsg }: { status: DocStatus; errorMsg?: string }) {
  if (status === 'processing') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Processing...
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"
        title={errorMsg}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Error
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Ready
    </span>
  )
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const data = new Uint8Array(buffer)
  const pdf = await pdfjsLib.getDocument({ data }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
    fullText += `${pageText}\n`
  }
  return fullText.trim()
}

async function extractImageText(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  const base64Image = Buffer.from(buffer).toString('base64')
  const res = await fetch('/api/ai/extract-image-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Image text extraction failed')
  }
  const { text } = await res.json()
  return text || ''
}

async function extractText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  if (file.type === 'application/pdf') {
    return extractPdfText(buffer)
  }
  if (file.type === 'text/plain') {
    return new TextDecoder().decode(buffer)
  }
  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    return extractImageText(buffer, file.type)
  }
  throw new Error(`Unsupported file type: ${file.type}`)
}

export default function StudyVaultPage() {
  const [docs, setDocs] = useState<VaultDoc[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/vault')
      if (!res.ok) return
      const { documents } = await res.json()
      setDocs((prev) => {
        // Merge: keep processing/error entries that aren't yet in the server response
        const serverFilenames = new Set(documents.map((d: any) => d.filename))
        const localOnly = prev.filter(
          (d) => (d.status === 'processing' || d.status === 'error') && !serverFilenames.has(d.filename)
        )
        const serverDocs: VaultDoc[] = documents.map((d: any) => ({
          filename: d.filename,
          created_at: d.created_at,
          status: 'ready' as DocStatus,
        }))
        return [...localOnly, ...serverDocs]
      })
    } catch (err) {
      console.error('[Vault] Failed to load docs:', err)
    } finally {
      setIsLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const processFile = async (file: File) => {
    setUploadError(null)

    // Validation
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('File is too large. Maximum size is 20 MB.')
      return
    }
    if (!ACCEPTED_TYPES.has(file.type)) {
      setUploadError('Unsupported file type. Please upload a PDF, JPG, PNG, or TXT file.')
      return
    }

    const newDoc: VaultDoc = {
      filename: file.name,
      created_at: new Date().toISOString(),
      status: 'processing',
    }

    setDocs((prev) => [newDoc, ...prev.filter((d) => d.filename !== file.name)])

    try {
      // 1. Extract text
      const text = await extractText(file)

      if (!text || text.trim().length < 10) {
        throw new Error('No readable text found in this file.')
      }

      // 2. Chunk & embed via /api/process
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          filename: file.name,
          document_type: 'note',
          source: 'vault',
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to process document')
      }

      // 3. Mark ready
      setDocs((prev) =>
        prev.map((d) =>
          d.filename === file.name ? { ...d, status: 'ready' } : d
        )
      )
    } catch (err: any) {
      console.error('[Vault] Processing error:', err)
      setDocs((prev) =>
        prev.map((d) =>
          d.filename === file.name
            ? { ...d, status: 'error', errorMsg: err.message }
            : d
        )
      )
      setUploadError(err.message || 'Failed to process file.')
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleDelete = async (filename: string) => {
    // Optimistic remove
    setDocs((prev) => prev.filter((d) => d.filename !== filename))

    try {
      const res = await fetch('/api/vault', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })
      if (!res.ok) {
        console.error('[Vault] Delete failed, reloading...')
        loadDocs()
      }
    } catch (err) {
      console.error('[Vault] Delete error:', err)
      loadDocs()
    }
  }

  const isUploading = docs.some((d) => d.status === 'processing')

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Study Vault</h1>
          <p className="text-slate-400">
            Upload your notes, textbook pages, or assignments. Your tutor will use them automatically.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            relative w-full h-64 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed
            transition-all duration-300 cursor-pointer select-none
            ${isDragging
              ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
              : isUploading
                ? 'border-indigo-500/50 bg-indigo-500/5 cursor-not-allowed'
                : 'border-slate-700 bg-slate-900/50 hover:border-indigo-500/60 hover:bg-indigo-500/5'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={handleFileInput}
            disabled={isUploading}
          />

          {isUploading ? (
            <>
              <svg className="w-12 h-12 text-indigo-400 mb-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-slate-200 text-lg font-medium">Processing your document...</p>
              <p className="text-slate-500 text-sm mt-1">Extracting and indexing content</p>
            </>
          ) : (
            <>
              <svg className="w-12 h-12 text-slate-500 mb-4 transition-colors group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-slate-200 text-lg font-medium">
                {isDragging ? 'Drop it here' : 'Drag & drop or tap to upload'}
              </p>
              <p className="text-slate-500 text-sm mt-1">PDF, JPG, PNG, TXT — up to 20 MB</p>
            </>
          )}
        </div>

        {/* Upload error */}
        {uploadError && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {uploadError}
          </div>
        )}

        {/* Document list */}
        {(isLoadingDocs || docs.length > 0) && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Uploaded Documents</h2>

            {isLoadingDocs && docs.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map((doc) => (
                  <div
                    key={doc.filename}
                    className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-slate-900/60 border border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon />
                      <div className="min-w-0">
                        <p className="text-slate-200 font-medium truncate text-sm">{doc.filename}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {new Date(doc.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={doc.status} errorMsg={doc.errorMsg} />
                      {doc.status !== 'processing' && (
                        <button
                          onClick={() => handleDelete(doc.filename)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete document"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoadingDocs && docs.length === 0 && (
          <div className="mt-10 text-center text-slate-600 text-sm">
            No documents yet. Upload your first file above.
          </div>
        )}
      </div>
    </div>
  )
}
