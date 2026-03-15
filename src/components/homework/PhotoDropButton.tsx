'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function PhotoDropButton() {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be under 20MB.');
      return;
    }

    setIsProcessing(true);
    toast.info('Processing your homework photo...');

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const response = await fetch('/api/homework/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to process image');
      }

      const data = await response.json();

      if (data.success && data.markdownContent) {
        // Pre-load tutor with extracted content
        localStorage.setItem(
          'forgestudy-tutor-prefill',
          `Here's my homework — help me work through it step by step:\n\n${data.markdownContent}`
        );
        localStorage.setItem('forgestudy-tutor-auto-send', 'true');
        toast.success('Homework extracted! Opening tutor...');
        router.push('/tutor?intent=new_question');
      } else {
        throw new Error('No content extracted');
      }
    } catch (error: any) {
      console.error('[PhotoDrop] Error:', error);
      toast.error(error.message || 'Failed to process homework photo');
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl text-white text-sm md:text-base font-semibold hover:bg-slate-800/60 transition-all disabled:opacity-60 disabled:cursor-wait"
        title="Photograph or upload homework"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
        ) : (
          <Camera className="w-4 h-4 md:w-5 md:h-5" />
        )}
        <span className="hidden sm:inline">{isProcessing ? 'Processing...' : 'Photo Drop'}</span>
      </button>
    </>
  );
}
