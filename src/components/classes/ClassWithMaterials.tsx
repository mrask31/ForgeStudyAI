'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { StudentClass } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import { 
  BookOpen, 
  Edit, 
  Calendar, 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  MessageSquare,
  Plus,
  Trash2,
  Loader2,
  X,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronDown
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { deleteDocuments } from '@/app/actions/binder'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface ClassWithMaterialsProps {
  classItem: StudentClass
  onEdit: (classItem: StudentClass) => void
  onRefresh: () => void
}

interface DocumentFile {
  filename: string
  document_type: string | null
  isActive: boolean
  canonicalId: string
  created_at?: string
}

interface SavedChat {
  id: string
  title: string
  updated_at: string
}

export default function ClassWithMaterials({ classItem, onEdit, onRefresh }: ClassWithMaterialsProps) {
  const router = useRouter()
  const [materials, setMaterials] = useState<DocumentFile[]>([])
  const [savedChats, setSavedChats] = useState<SavedChat[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [uploadDocumentType, setUploadDocumentType] = useState<'syllabus' | 'textbook' | null>(null)
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [showSessions, setShowSessions] = useState(false) // Collapsible sessions
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMaterials()
    loadSavedChats()
  }, [classItem.id])

  // Auto-refresh materials every 2 seconds when upload is in progress
  useEffect(() => {
    if (isUploading) {
      const interval = setInterval(() => {
        loadMaterials()
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [isUploading])

  const loadMaterials = async () => {
    try {
      const res = await fetch('/api/binder', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const allFiles = data.files || []
        
        // Debug logging - show ALL files and their metadata
        console.log('[ClassWithMaterials] ===== LOADING MATERIALS =====')
        console.log('[ClassWithMaterials] All files received:', allFiles.length)
        console.log('[ClassWithMaterials] Looking for classId:', classItem.id)
        console.log('[ClassWithMaterials] Class code:', classItem.code)
        
        // Log ALL files with full structure
        console.log('[ClassWithMaterials] ALL FILES DETAIL:', JSON.stringify(allFiles, null, 2))
        
        // Filter files that belong to this class
        const classFiles = allFiles.filter((f: any) => {
          // Check multiple possible locations for class_id
          const fileClassId = f.metadata?.class_id || f.class_id || f.metadata?.classId
          const matches = fileClassId === classItem.id
          
          // Log each file for debugging
          console.log('[ClassWithMaterials] Checking file:', f.filename, {
            fileClassId: fileClassId,
            classItemId: classItem.id,
            matches: matches,
            fullFile: f
          })
          
          return matches
        })
        
        console.log('[ClassWithMaterials] Filtered files for class:', classFiles.length)
        console.log('[ClassWithMaterials] Filtered files:', classFiles.map((f: any) => f.filename))
        
        // Map to DocumentFile format
        const mappedFiles: DocumentFile[] = classFiles.map((f: any) => ({
          filename: f.filename,
          document_type: f.document_type,
          isActive: f.metadata?.is_active !== false, // Default to true if not set
          canonicalId: f.id || f.file_key,
          created_at: f.created_at
        }))
        
        console.log('[ClassWithMaterials] Mapped files:', mappedFiles.length)
        console.log('[ClassWithMaterials] ===== END LOADING =====')
        
        setMaterials(mappedFiles)
      } else {
        console.error('[ClassWithMaterials] API error:', res.status, res.statusText)
      }
    } catch (error) {
      console.error('Failed to load materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSavedChats = async () => {
    try {
      const res = await fetch(`/api/chats/list?classId=${classItem.id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSavedChats(data.chats || [])
      }
    } catch (error) {
      console.error('Failed to load saved chats:', error)
    }
  }

  const handleUpload = async (file: File) => {
    if (!uploadDocumentType) {
      setUploadStatus('error')
      setTimeout(() => setUploadStatus('idle'), 3000)
      return
    }

    setIsUploading(true)
    setUploadStatus('idle')
    
    try {
      const fileExtension = file.name.toLowerCase().split('.').pop()
      const fileType = file.type

      if (fileExtension === 'doc') {
        alert('Please save as .docx or PDF. Legacy .doc files are not supported.')
        setIsUploading(false)
        return
      }

      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]

      if (!allowedTypes.includes(fileType) && fileExtension !== 'pdf' && fileExtension !== 'docx') {
        alert('Please upload a PDF or DOCX file.')
        setIsUploading(false)
        return
      }

      const buffer = await file.arrayBuffer()
      let text = ''

      if (fileExtension === 'pdf' || fileType === 'application/pdf') {
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items.map((item: any) => item.str).join(' ') + '\n\n'
        }
      } else if (fileExtension === 'docx' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer })
        text = result.value
        text = text.replace(/\n{3,}/g, '\n\n')
      }

      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the document')
      }

      console.log('[ClassWithMaterials] Uploading file:', {
        filename: file.name,
        document_type: uploadDocumentType,
        class_id: classItem.id,
        class_code: classItem.code
      })

      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          filename: file.name, 
          document_type: uploadDocumentType,
          class_id: classItem.id
        })
      })
      
      console.log('[ClassWithMaterials] Upload response status:', res.status, res.ok)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || 'Upload failed')
      }

      // Success - wait a moment for processing, then reload
      setUploadStatus('success')
      setTimeout(async () => {
        await loadMaterials()
        setShowUpload(false)
        setUploadDocumentType(null)
        setUploadStatus('idle')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        onRefresh()
      }, 1500)
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      alert(error.message || 'Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }


  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return
    try {
      await deleteDocuments([filename])
      loadMaterials()
      onRefresh()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const handleStudyClass = async () => {
    // Check if there's a recent active chat for this class (within last 48 hours)
    try {
      setIsCreatingChat(true)
      const res = await fetch(`/api/chats/list?classId=${classItem.id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const classChats = data.chats || []
        
        // Find the most recent chat that's been updated in the last 48 hours
        const recentChat = classChats
          .filter((chat: SavedChat) => {
            const updatedAt = new Date(chat.updated_at)
            const hoursAgo = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)
            return hoursAgo <= 48 // Within last 48 hours
          })
          .sort((a: SavedChat, b: SavedChat) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )[0]
        
        if (recentChat) {
          // Continue the recent chat
          console.log('[ClassWithMaterials] Continuing recent chat:', recentChat.id)
          router.push(`/tutor?mode=tutor&sessionId=${recentChat.id}&classId=${classItem.id}`)
        } else {
          // Start fresh with class context
          console.log('[ClassWithMaterials] Starting fresh chat for class:', classItem.id)
          router.push(`/tutor?mode=tutor&classId=${classItem.id}&intent=new_question`)
        }
      } else {
        // If API fails, just navigate with classId
        router.push(`/tutor?mode=tutor&classId=${classItem.id}&intent=new_question`)
      }
    } catch (error) {
      console.error('[ClassWithMaterials] Error checking for recent chats:', error)
      // Fallback: just navigate with classId
      router.push(`/tutor?mode=tutor&classId=${classItem.id}&intent=new_question`)
    } finally {
      // Reset loading state after navigation (component will unmount on navigation)
      setTimeout(() => setIsCreatingChat(false), 1000)
    }
  }

  const handleOpenChat = (chatId: string) => {
    router.push(`/tutor?sessionId=${chatId}`)
  }

  const classMaterials = materials.filter(f => f.document_type !== 'note')
  const hasMaterials = classMaterials.length > 0
  const syllabi = classMaterials.filter(f => f.document_type === 'syllabus')
  const textbooks = classMaterials.filter(f => f.document_type === 'textbook')

  return (
    <div className="bg-white/80 backdrop-blur-sm border-2 border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-200/30 transition-all duration-300 flex flex-col h-full overflow-hidden group transform hover:scale-[1.02]">
      {/* Class Header - Always Visible */}
      <div className="p-6 flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {classItem.code}
              </h3>
              <Badge variant="outline" className="text-xs font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200/60 text-indigo-700 shadow-sm">
                {classItem.type === 'med_surg' ? 'Med-Surg' : 
                 classItem.type === 'pharm' ? 'Pharmacology' :
                 classItem.type === 'peds' ? 'Pediatrics' :
                 classItem.type === 'ob' ? 'OB/GYN' :
                 classItem.type === 'psych' ? 'Psychiatric' :
                 classItem.type === 'fundamentals' ? 'Fundamentals' : 'Other'}
              </Badge>
            </div>
            <p 
              className="text-sm text-slate-600 mb-3 truncate" 
              title={classItem.name}
            >
              {classItem.name}
            </p>
            {classItem.nextExamDate && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Calendar className="w-3 h-3" />
                <span>Next exam: {new Date(classItem.nextExamDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(classItem)}
            className="shrink-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">
              {classMaterials.length} {classMaterials.length === 1 ? 'material' : 'materials'}
            </span>
          </div>
          {syllabi.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Syllabi: {syllabi.length}</Badge>
            </div>
          )}
          {textbooks.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Textbooks: {textbooks.length}</Badge>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="mb-4">
          <Button
            onClick={handleStudyClass}
            disabled={isCreatingChat}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 transition-all duration-200 transform hover:scale-105 active:scale-95 font-semibold"
            size="lg"
          >
            {isCreatingChat ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Starting session...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Study with AI Tutor
              </>
            )}
          </Button>
        </div>

        {/* Upload Section */}
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setShowUpload(!showUpload)}
            className="w-full"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : showUpload ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancel Upload
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 mr-2" />
                Upload Materials
              </>
            )}
          </Button>

          {/* Inline Upload UI */}
          {showUpload && (
            <div className="mt-3 p-4 bg-gradient-to-br from-slate-50/80 to-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setUploadDocumentType('syllabus')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    uploadDocumentType === 'syllabus'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                      : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  📋 Syllabus
                </button>
                <button
                  type="button"
                  onClick={() => setUploadDocumentType('textbook')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    uploadDocumentType === 'textbook'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                      : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  📚 Textbook/PDF
                </button>
              </div>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                uploadDocumentType 
                  ? 'border-indigo-300 bg-indigo-50/30 hover:border-indigo-400 cursor-pointer' 
                  : 'border-slate-300 bg-white opacity-50 cursor-not-allowed'
              } ${uploadStatus === 'success' ? 'border-emerald-300 bg-emerald-50' : ''}
              ${uploadStatus === 'error' ? 'border-red-300 bg-red-50' : ''}`}
              onClick={() => uploadDocumentType && !isUploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={!uploadDocumentType || isUploading}
                  onChange={(e) => {
                    if (e.target.files?.[0] && uploadDocumentType) {
                      handleUpload(e.target.files[0])
                    }
                  }}
                />
                {uploadStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-medium text-emerald-700">Upload successful!</p>
                    <p className="text-xs text-emerald-600 mt-1">Your file is being processed...</p>
                  </>
                ) : uploadStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                    <p className="text-sm font-medium text-red-700">Upload failed</p>
                    <p className="text-xs text-red-600 mt-1">Please try again</p>
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="animate-spin text-indigo-600 w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm text-slate-700 font-medium">Processing your file...</p>
                    <p className="text-xs text-slate-500 mt-1">This may take a moment</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="text-indigo-600 w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm text-slate-700 font-medium mb-1">
                      {uploadDocumentType 
                        ? 'Click to upload or drag and drop' 
                        : 'Select document type above'}
                    </p>
                    <p className="text-xs text-slate-500">PDF or DOCX · Max 20MB</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Materials List - Always Visible */}
        {hasMaterials ? (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Your Materials
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {classMaterials.map((file) => (
                <div
                  key={file.canonicalId}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-200"
                  onClick={(e) => {
                    // Prevent any click events from bubbling up
                    e.stopPropagation()
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {file.filename}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {file.document_type === 'syllabus' ? 'Syllabus' :
                           file.document_type === 'textbook' ? 'Textbook' :
                           file.document_type === 'reference' ? 'Reference' : 'Document'}
                        </Badge>
                        {file.created_at && (
                          <span className="text-xs text-slate-400">
                            {new Date(file.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(file.filename)
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0 shrink-0"
                      aria-label={`Delete ${file.filename}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !showUpload && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-600">No materials yet</p>
              <p className="text-xs text-slate-500 mt-1">Upload syllabi and textbooks to get started</p>
            </div>
          )
        )}

        {/* Saved Chats - Collapsible */}
        {savedChats.length > 0 && (
          <div className="border-t border-slate-200 pt-4 mt-auto">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-indigo-600 transition-colors">
                Recent Study Sessions ({savedChats.length})
              </h4>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showSessions ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${showSessions ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-2">
                {savedChats.slice(0, 5).map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleOpenChat(chat.id)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-300 transition-all duration-200 group shadow-sm hover:shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-indigo-600 transition-colors" />
                        <span className="text-sm text-slate-700 truncate group-hover:text-indigo-600 font-medium">
                          {chat.title || 'Untitled Chat'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">
                          {new Date(chat.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
                {savedChats.length > 5 && (
                  <p className="text-xs text-slate-500 text-center pt-1">
                    +{savedChats.length - 5} more sessions
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
