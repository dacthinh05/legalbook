'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Bot,
  Loader2,
} from 'lucide-react';
import { queryLegalAssistant, type LegalAiResponse } from '@/lib/ai/legal-rag';
import { MarkdownRenderer, renderInlineMarkdown } from '@/components/common/MarkdownRenderer';
import type { LegalDocument } from '@/types';
interface LegalAiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument?: LegalDocument | null;
  onNavigateToNode?: (nodeId: string) => void;
  onSelectDocument?: (id: string) => void;
}

export function LegalAiAssistant({
  isOpen,
  onClose,
  currentDocument,
  onNavigateToNode,
  onSelectDocument: _onSelectDocument,
}: LegalAiAssistantProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<LegalAiResponse | null>(null);
  const [history, setHistory] = useState<Array<{ query: string; response: LegalAiResponse }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const initialSuggestions = currentDocument
    ? [
        `Phạm vi điều chỉnh của ${currentDocument.document_number || 'văn bản'}`,
        `Thời điểm hiệu lực & lộ trình thi hành`,
        `Đối tượng áp dụng và trách nhiệm tuân thủ`,
      ]
    : [
        'Lộ trình áp dụng IFRS / VFRS tại Việt Nam',
        'Chế độ kế toán cho doanh nghiệp siêu nhỏ',
        'Quy định giảm thuế GTGT mới nhất',
      ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleAsk = useCallback(
    async (qText: string) => {
      const clean = qText.trim();
      if (!clean) return;

      setIsLoading(true);
      setQuery('');

      try {
        const apiRes = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: clean,
            documentId: currentDocument?.id,
            mode: 'ask',
          }),
        }).then((r) => r.json()).catch(() => null);

        if (apiRes && apiRes.success) {
          const aiResponse: LegalAiResponse = {
            answer: apiRes.answer,
            summaryPoints: apiRes.summaryPoints || [],
            citations: apiRes.citations || [],
            relevantArticles: apiRes.relevantArticles || [],
            suggestedFollowUps: apiRes.suggestedFollowUps || [],
          };
          setResponse(aiResponse);
          setHistory((prev) => [...prev, { query: clean, response: aiResponse }]);
        } else {
          const res = await queryLegalAssistant(clean, currentDocument);
          setResponse(res);
          setHistory((prev) => [...prev, { query: clean, response: res }]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currentDocument]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 select-text">
        {/* 1. Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs uppercase font-bold tracking-wider text-blue-300">AI Trợ lý Pháp chế</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded text-[10px] font-semibold">
                  Zero-Hallucination
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">Tra cứu & Dẫn chiếu Điều khoản</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Đóng trợ lý"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Messages & Response Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {!response && history.length === 0 && (
            <div className="space-y-4 pt-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-700">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Hỏi đáp & Dẫn chiếu Pháp lý Trực tiếp</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Mọi câu trả lời được đối chiếu và trích xuất nguyên bản từ Điều khoản văn bản quy định.
                </p>
              </div>

              {/* Quick suggestions */}
              <div className="pt-3 space-y-2 text-left">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gợi ý câu hỏi</div>
                <div className="space-y-1.5">
                  {initialSuggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleAsk(sug)}
                      className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-xs font-medium text-slate-700 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="truncate">{sug}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Render Active / Last Response */}
          {response && (
            <div className="space-y-4">
              {/* Answer Card */}
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>Căn cứ Pháp lý Trích xuất:</span>
                </div>
                <MarkdownRenderer content={response.answer} className="text-xs text-slate-800" />

                {response.summaryPoints.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">Điểm trọng tâm:</span>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                      {response.summaryPoints.map((pt, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {renderInlineMarkdown(pt, `pt-${idx}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Citations list */}
              {response.citations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Dẫn chiếu nguồn ({response.citations.length})
                  </div>
                  <div className="space-y-2">
                    {response.citations.map((cit, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-blue-100 rounded-lg hover:border-blue-300 transition-all space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-blue-900">{cit.documentNumber}</span>
                          <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                            {Math.round(cit.confidence * 100)}% khớp
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-900">{cit.articleTitle}</div>
                        <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">
                          &ldquo;{cit.exactQuote}&rdquo;
                        </p>
                        {cit.articleNumber && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => {
                                onNavigateToNode?.(`dieu-${cit.articleNumber}`);
                                onClose();
                              }}
                              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                            >
                              <span>Đến {cit.articleTitle}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up suggestions */}
              {response.suggestedFollowUps.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Câu hỏi tiếp theo</div>
                  <div className="flex flex-wrap gap-1.5">
                    {response.suggestedFollowUps.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleAsk(sug)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 rounded-full text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center space-y-2 text-blue-700">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <div className="text-xs font-semibold text-slate-700">Đang đối chiếu điều khoản văn bản...</div>
            </div>
          )}
        </div>

        {/* 3. Input bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(query);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Đặt câu hỏi pháp lý hoặc tra cứu nội dung..."
              className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="p-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 cursor-pointer shadow-2xs"
              aria-label="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
