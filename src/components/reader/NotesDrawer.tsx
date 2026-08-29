'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Tag as TagIcon, StickyNote } from 'lucide-react';
import type { LegalDocument, Note } from '@/types';

interface NotesDrawerProps {
  document: LegalDocument;
  onClose: () => void;
}

export function NotesDrawer({ document: doc, onClose }: NotesDrawerProps) {
  const storageKey = `lb_notes_${doc.id}`;

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return [];
  });
  const [newContent, setNewContent] = useState('');

  const saveNotes = (updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const noteItem: Note = {
      id: `note-${Date.now()}`,
      user_id: 'user-default',
      document_id: doc.id,
      content: newContent.trim(),
      page_number: null,
      is_shared: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveNotes([noteItem, ...notes]);
    setNewContent('');
  };

  const handleDeleteNote = (id: string) => {
    saveNotes(notes.filter((n) => n.id !== id));
  };

  const TAGS = ['Cần lưu ý', 'Kiểm toán 2026', 'Khách hàng FDI', 'Quyết toán thuế', 'Tham khảo'];

  return (
    <div className="w-80 md:w-96 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden shadow-lg animate-slide-in flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Ghi chú cá nhân
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* New Note Form */}
        <form onSubmit={handleAddNote} className="space-y-2 bg-amber-50/50 p-3 rounded-lg border border-amber-200">
          <span className="font-semibold text-gray-800 text-[11px] block">Thêm ghi chú mới:</span>
          <textarea
            rows={3}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Viết nhận xét, điều cần lưu ý hoặc hướng xử lý nghiệp vụ..."
            className="w-full text-xs p-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-800 placeholder:text-gray-400"
          />

          {/* Quick Tag Selector */}
          <div className="flex items-center gap-1 flex-wrap pt-1">
            <TagIcon className="w-3 h-3 text-gray-400" />
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setNewContent((prev) => (prev ? `${prev} #${tag}` : `#${tag} `))}
                className="text-[10px] px-1.5 py-0.5 bg-white hover:bg-amber-100 border border-amber-200 rounded text-amber-800 font-medium transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!newContent.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-md font-medium text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Lưu ghi chú
            </button>
          </div>
        </form>

        {/* Existing Notes List */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-600 text-[11px]">
            Danh sách ghi chú ({notes.length})
          </h4>
          {notes.length === 0 ? (
            <p className="text-gray-400 text-center py-6 italic text-[11px]">
              Chưa có ghi chú nào cho văn bản này.
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-white border border-gray-200 rounded-lg shadow-2xs space-y-1.5 relative group hover:border-gray-300"
              >
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>{new Date(note.created_at).toLocaleDateString('vi-VN')}</span>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-opacity"
                    title="Xóa ghi chú"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-gray-800 text-[11px] leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
