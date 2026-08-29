'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { askLegalAi, type LegalCitation } from '@/lib/ai/legal-rag';
import type { LegalDocument } from '@/types';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  citations?: LegalCitation[];
  suggestedFollowUps?: string[];
  source?: 'gemini' | 'local_rag';
  timestamp: string;
}

interface LegalAiChatPanelProps {
  document: LegalDocument;
  onClose: () => void;
  onCitationClick?: (articleNumber?: string) => void;
}

export function LegalAiChatPanel({
  document: doc,
  onClose,
  onCitationClick,
}: LegalAiChatPanelProps) {
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Xin chào! Tôi là **Trợ lý Pháp lý AI** của LegalBook (vận hành bởi Google Gemini).\n\nTôi đã nạp toàn văn **${doc.document_number || doc.title}** vào ngữ cảnh. Bạn có thể hỏi bất kỳ câu hỏi nghiệp vụ nào về căn cứ, mức thuế, thủ tục hoặc các điểm mới!`,
      suggestedFollowUps: [
        'Điểm mới cốt lõi của văn bản này là gì?',
        'Trách nhiệm và nghĩa vụ của doanh nghiệp?',
        'Thời điểm hiệu lực và điều khoản chuyển tiếp?',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await askLegalAi({
        question: query,
        currentDoc: doc,
        mode: 'ask',
      });

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.answer,
        citations: response.citations,
        suggestedFollowUps: response.suggestedFollowUps,
        source: response.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error asking Legal AI:', err);
      const errorMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'Rất tiếc, đã có lỗi kết nối tạm thời khi truy vấn AI. Vui lòng thử lại câu hỏi.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `Đã làm mới cuộc hội thoại. Hãy đặt câu hỏi về **${doc.document_number || doc.title}**.`,
        suggestedFollowUps: [
          'Điểm mới cốt lõi của văn bản này là gì?',
          'Nghĩa vụ và trách nhiệm của người nộp thuế?',
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="w-80 sm:w-96 md:w-[380px] bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shadow-xl animate-in slide-in-from-right duration-200 flex-shrink-0 z-30 select-text">
      {/* ── 1. Panel Header ── */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-lg shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Trợ lý Pháp lý AI</span>
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[9.5px] font-semibold">
                Gemini 2.5
              </span>
            </h3>
            <p className="text-[10.5px] text-slate-500 truncate">
              Hỏi đáp trực tiếp trên văn bản đang đọc
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
            title="Làm mới cuộc trò chuyện"
            aria-label="Làm mới cuộc trò chuyện"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
            title="Đóng bảng AI"
            aria-label="Đóng bảng AI"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 2. Active Document Context Chip ── */}
      <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 text-xs flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-mono font-bold text-blue-950 truncate">
            {doc.document_number || 'Văn bản hiện tại'}
          </span>
        </div>
        <span className="text-[10.5px] font-medium text-blue-700 shrink-0">
          Toàn văn ngữ cảnh
        </span>
      </div>

      {/* ── 3. Chat Messages Thread ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2.5 max-w-full',
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.sender === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={cn(
                'rounded-xl p-3 max-w-[88%] space-y-2 leading-relaxed break-words',
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white shadow-2xs rounded-tr-xs'
                  : 'bg-slate-100/90 text-slate-800 border border-slate-200/80 rounded-tl-xs'
              )}
            >
              {/* Message text with basic markdown formatting */}
              <div className="text-xs whitespace-pre-wrap leading-relaxed space-y-1">
                {msg.text.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="font-bold">{line.replace(/\*\*/g, '')}</p>;
                  }
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return (
                      <div key={i} className="flex items-start gap-1.5 pl-1">
                        <span className="text-blue-500">•</span>
                        <span>{line.replace(/^[-*]\s*/, '')}</span>
                      </div>
                    );
                  }
                  return <p key={i}>{line}</p>;
                })}
              </div>

              {/* Citations list if present */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Căn cứ trích dẫn pháp lý:
                  </span>
                  <div className="space-y-1">
                    {msg.citations.map((c, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => onCitationClick?.(c.articleNumber)}
                        className="w-full text-left p-1.5 bg-white border border-slate-200 rounded text-[11px] hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-between gap-1 group cursor-pointer"
                      >
                        <div className="truncate">
                          <span className="font-mono font-bold text-blue-900 mr-1">
                            {c.articleNumber || c.documentNumber}
                          </span>
                          <span className="text-slate-600 truncate">{c.articleTitle || c.documentTitle}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Follow-up Prompts */}
              {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80 space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <HelpCircle className="w-2.5 h-2.5" />
                    Gợi ý câu hỏi tiếp theo:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {msg.suggestedFollowUps.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleSendMessage(prompt)}
                        className="text-[10.5px] text-left px-2 py-1 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-800 rounded-md transition-colors cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[9.5px] text-slate-400 pt-0.5">
                <span>{msg.timestamp}</span>
                {msg.source && (
                  <span className="font-mono">{msg.source === 'gemini' ? 'AI Cloud' : 'Local'}</span>
                )}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-2.5 justify-start max-w-full animate-in fade-in">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-100 rounded-xl rounded-tl-xs p-3 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Đang tra cứu và phân tích điều khoản...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── 4. Prompt Input Bar ── */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Hỏi AI về văn bản này..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-40 cursor-pointer shrink-0 shadow-2xs"
            title="Gửi câu hỏi (Enter)"
            aria-label="Gửi câu hỏi"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-1.5">
          AI đối chiếu trực tiếp trên văn bản gốc · Kiểm tra kỹ trước khi áp dụng
        </p>
      </div>
    </div>
  );
}
