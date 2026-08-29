'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileUp, ShieldCheck } from 'lucide-react';
import { IMPORT_CONFIG } from '@/lib/document-import/types';

interface DropzoneAreaProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  maxFileSize?: number;
}

export function DropzoneArea({
  onFilesSelected,
  disabled = false,
  maxFileSize = IMPORT_CONFIG.MAX_FILE_SIZE,
}: DropzoneAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent default window drag and drop behavior to avoid browser opening files
  useEffect(() => {
    const preventWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', preventWindowDrop);
    window.addEventListener('drop', preventWindowDrop);
    return () => {
      window.removeEventListener('dragover', preventWindowDrop);
      window.removeEventListener('drop', preventWindowDrop);
    };
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files || []);
      if (droppedFiles.length > 0) {
        onFilesSelected(droppedFiles);
      }
    },
    [disabled, onFilesSelected]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
    // Reset file input value so selecting the same file again triggers change if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const maxMb = (maxFileSize / (1024 * 1024)).toFixed(0);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Vùng kéo thả tệp văn bản Word hoặc PDF"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onKeyDown={handleKeyDown}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
        isDragOver
          ? 'border-blue-500 bg-blue-50/70 shadow-inner'
          : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-400'
      } ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
        className="sr-only"
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center justify-center gap-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isDragOver ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
          }`}
        >
          <Upload className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">
            Kéo thả tệp Word (.docx, .doc) hoặc PDF vào đây
          </p>
          <p className="text-xs text-slate-500">
            Khuyến nghị: <strong>.DOCX</strong> & <strong>.PDF</strong> (giữ nguyên bảng biểu) &bull; Tối đa {maxMb}MB/tệp
          </p>
          <p className="text-[11px] text-amber-700">
            * Tệp .DOC (Word 97-2003 cũ) được trích xuất văn bản thô, khuyến nghị đổi sang .DOCX trước khi tải lên.
          </p>
        </div>

        <div className="pt-1 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <FileUp className="w-4 h-4 text-slate-500" />
            <span>Chọn file từ máy</span>
          </button>
        </div>

        <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Kiểm tra chữ ký số tệp (Magic bytes), khử độc XSS và bảo mật dữ liệu</span>
        </div>
      </div>
    </div>
  );
}
