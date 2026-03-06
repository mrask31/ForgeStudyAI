/**
 * Dual-Intake Airlock Component
 * Requirements: 5.6, 5.7, 5.8, 5.9, 5.10, 8.5
 * 
 * Combines LMS sync status indicator with manual upload interface.
 * Maintains manual upload as a first-class feature alongside automated sync.
 * Dark Space UI with glassmorphic styling.
 */

'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import type { StudentSyncStatusResponse } from '@/lib/lms/types';

interface DualIntakeAirlockProps {
  studentId: string;
  onFileUpload: (file: File) => Promise<void>;
  recentUploads?: Array<{
    id: string;
    filename: string;
    uploadedAt: string;
    isMerged?: boolean;
    syncedAssignmentTitle?: string;
  }>;
  isUploading?: boolean;
}

export function DualIntakeAirlock({
  studentId,
  onFileUpload,
  recentUploads = [],
  isUploading = false,
}: DualIntakeAirlockProps) {
  const [syncStatus, setSyncStatus] = useState<StudentSyncStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch sync status on mount and every 5 minutes
  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [studentId]);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/student/sync-status');
      if (!response.ok) {
        console.error('[DualIntakeAirlock] Failed to fetch sync status');
        return;
      }

      const data: StudentSyncStatusResponse = await response.json();
      setSyncStatus(data);
    } catch (error) {
      console.error('[DualIntakeAirlock] Error fetching sync status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await onFileUpload(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await onFileUpload(files[0]);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-8">
      {/* Sync Status Indicator */}
      {!isLoadingStatus && syncStatus && (
        <SyncStatusIndicator connections={syncStatus.connections} />
      )}

      {/* Explanatory Text */}
      <div className="text-center">
        <p className="text-slate-300 text-lg font-medium mb-2">
          School blocked the connection? Or have a physical handout?
        </p>
        <p className="text-slate-400 text-sm">
          Drop your PDFs and photos here. Manual upload is always available.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group w-full h-72 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.15)]'
            : 'border-slate-700 bg-slate-900/40 backdrop-blur-md hover:border-indigo-500 hover:bg-indigo-500/10 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]'
        }`}
      >
        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
          {isUploading ? (
            <>
              <Loader2 className="w-16 h-16 text-indigo-400 mb-6 animate-spin" />
              <p className="text-slate-200 text-xl font-medium mb-2">👁️ AI is reading your document...</p>
              <p className="text-slate-400 text-sm">Extracting text, formulas, and diagrams</p>
            </>
          ) : (
            <>
              <UploadCloud
                size={64}
                className="text-slate-500 mb-6 transition-colors group-hover:text-indigo-400"
              />
              <p className="text-slate-200 text-xl font-medium mb-3">
                Drag & drop your files here
              </p>
              <p className="text-slate-500 text-sm">
                Supports PDF, DOCX, Images, and TXT up to 50MB
              </p>
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Recent Uploads */}
      {recentUploads.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Recent Uploads</h2>
          <div className="space-y-4">
            {recentUploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-5 bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl"
              >
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-slate-200 font-medium">{upload.filename}</p>
                    <p className="text-slate-500 text-sm">{formatDate(upload.uploadedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {upload.isMerged && upload.syncedAssignmentTitle && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Merged with "{upload.syncedAssignmentTitle}"
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Uploaded
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
