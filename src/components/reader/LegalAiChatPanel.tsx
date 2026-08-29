'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RotateCcw,
  ChevronRight,
  Loader2,
  HelpCircle,
  Compass,
  Shield,
  Headphones,
  ExternalLink,
} from 'lucide-react';
import { cn, NOTEBOOKLM_URL } from '@/lib/utils';
import { askLegalAi, type LegalCitation } from '@/lib/ai/legal-rag';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import type { LegalDocument } from '@/types';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  citations?: LegalCitation[];
  suggestedFollowUps?: string[];
  source?: 'gemini' | 'local_rag';
  timestamp: string;
  scope?: 'in_document' | 'whole_library';
}

interface LegalAiChatPanelProps {
  document: LegalDocument;
  onClose: () => void;
  onCitationClick?: (articleNumber?: string, quoteSnippet?: string) => void;
}

let chatMsgCounter = 0;
function getNextChatMsgId(prefix: string) {
  chatMsgCounter += 1;
  return `${prefix}-${chatMsgCounter}`;
}

const SMART_ACTION_PROMPTS = [
  {
    id: 'conditions',
    label: 'Bảng điều kiện',
    prompt: 'Hãy lập bảng tóm tắt chi tiết các điều kiện áp dụng, đối tượng và thời hạn theo văn bản này.',
  },
  {
    id: 'risks',
    label: 'Rủi ro thuế & chi phí',
    prompt: 'Hãy bóc tách các rủi ro pháp lý và nguy cơ bị loại chi phí thuế nếu doanh nghiệp áp dụng sai quy định.',
  },
  {
    id: 'dossier',
    label: 'Hồ sơ & Chứng từ',
    prompt: 'Liệt kê danh mục hồ sơ, chứng từ bắt buộc cần lưu trữ để phục vụ giải trình, kiểm tra thuế theo văn bản này.',
  },
];

export function LegalAiChatPanel({
  document: doc,
  onClose,
  onCitationClick,
}: LegalAiChatPanelProps) {
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scope, setScope] = useState<'in_document' | 'whole_library'>('in_document');

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: getNextChatMsgId('welcome'),
      sender: 'ai',
      text: `Xin chào! Tôi là Trợ lý Pháp lý AI của LegalBook. Tôi có thể giải đáp các điều khoản, đối chiếu quy định và hướng dẫn nghiệp vụ về văn bản **${doc.document_number || doc.title}**.`,
      suggestedFollowUps: [
        'Văn bản này có những điểm mới cốt lõi nào?',
        'Đối tượng áp dụng và điều kiện thực hiện?',
        'Lưu ý gì về hạch toán chi phí và hóa đơn chứng từ?',
      ],
      timestamp: 'Bây giờ',
      scope: 'in_document',
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

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: getNextChatMsgId('user'),
      sender: 'user',
      text: query,
      timestamp: nowStr,
      scope,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const isSummaryQuery =
        query.toLowerCase().includes('tóm tắt') ||
        query.toLowerCase().includes('tom tat') ||
        query.toLowerCase().includes('summary');

      const response = await askLegalAi({
        question: query,
        currentDoc: scope === 'in_document' ? doc : null,
        mode: isSummaryQuery ? 'summary' : 'ask',
      });

      const aiMsg: Message = {
        id: getNextChatMsgId('ai'),
        sender: 'ai',
        text: response.answer,
        citations: response.citations,
        suggestedFollowUps: response.suggestedFollowUps,
        source: response.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        scope,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error asking Legal AI:', err);
      const errorMsg: Message = {
        id: getNextChatMsgId('ai-err'),
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
        id: getNextChatMsgId('welcome'),
        sender: 'ai',
        text: `Đã làm mới cuộc hội thoại. Hãy đặt câu hỏi về **${doc.document_number || doc.title}**.`,
        suggestedFollowUps: [
          'Điểm mới cốt lõi của văn bản này là gì?',
          'Nghĩa vụ và trách nhiệm của người nộp thuế?',
        ],
        timestamp: 'Bây giờ',
        scope: 'in_document',
      },
    ]);
  };

  return (
    <div className="w-80 sm:w-96 md:w-[400px] bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shadow-xl animate-in slide-in-from-right duration-200 flex-shrink-0 z-30 select-text">
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

      {/* ── 2. Scope Selector Bar (Minimal clean segmented control) ── */}
      <div className="px-3 py-1.5 bg-slate-100/80 border-b border-slate-200 text-xs flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200/90 text-[11px] font-semibold w-full">
          <button
            type="button"
            onClick={() => setScope('in_document')}
            className={cn(
              'flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer',
              scope === 'in_document'
                ? 'bg-blue-50 text-blue-900 font-bold shadow-2xs border border-blue-200'
                : 'text-slate-600 hover:text-slate-900'
            )}
            title="Chỉ tra cứu trong văn bản đang đọc"
          >
            Trong văn bản
          </button>

          <button
            type="button"
            onClick={() => setScope('whole_library')}
            className={cn(
              'flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer',
              scope === 'whole_library'
                ? 'bg-blue-50 text-blue-900 font-bold shadow-2xs border border-blue-200'
                : 'text-slate-600 hover:text-slate-900'
            )}
            title="Mở rộng tra cứu toàn bộ cơ sở dữ liệu pháp luật"
          >
            Toàn thư viện
          </button>
        </div>
      </div>

      {/* ── 3. Chat Messages Thread ── */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2 max-w-full',
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
              {/* Message text with rich Markdown */}
              {msg.sender === 'user' ? (
                <div className="text-xs whitespace-pre-wrap leading-relaxed font-medium">
                  {msg.text}
                </div>
              ) : (
                <MarkdownRenderer content={msg.text} className="text-xs text-slate-800" />
              )}

              {/* Citations with Deep-Link Navigation */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Căn cứ pháp lý trích dẫn:
                  </span>
                  <div className="space-y-1">
                    {msg.citations.map((c, cIdx) => {
                      const docNum = c.documentNumber?.trim() || '';
                      const artNum = c.articleNumber?.trim() || '';
                      let title = (c.articleTitle || c.documentTitle || '').trim();

                      if (docNum) {
                        const escapedDoc = docNum.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        title = title.replace(new RegExp(`^(?:${escapedDoc}[\\s:–—.-]*)+`, 'i'), '').trim();
                      }
                      if (artNum) {
                        const escapedArt = artNum.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        title = title.replace(new RegExp(`^(?:${escapedArt}[\\s:–—.-]*)+`, 'i'), '').trim();
                      }
                      const badgeText = artNum || docNum;
                      const displayText = title || (artNum ? docNum : '');

                      return (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => onCitationClick?.(c.articleNumber, c.exactQuote)}
                          className="w-full text-left p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] hover:border-blue-300 hover:bg-blue-50/60 transition-colors flex items-center justify-between gap-1.5 group cursor-pointer shadow-2xs"
                          title={`Xem chi tiết căn cứ và cuộn tới vị trí: ${badgeText}`}
                        >
                          <div className="truncate flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-bold text-blue-900 shrink-0 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 text-[10.5px]">
                              {badgeText}
                            </span>
                            {displayText && displayText !== badgeText && (
                              <span className="text-slate-700 truncate font-medium">{displayText}</span>
                            )}
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Follow-up Prompts */}
              {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80 space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium block">
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
          <div className="flex gap-2 justify-start max-w-full animate-in fade-in">
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

      {/* ── 4. Smart Action Prompt Chips & Input Bar ── */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2">
        {/* 3 Quick Action Buttons (clean minimal chips without emoji) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          <a
            href={NOTEBOOKLM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-md text-[11px] font-semibold transition-colors shrink-0 cursor-pointer inline-flex items-center gap-1"
            title="Mở Sổ tay NotebookLM & Nghe Audio Overview"
          >
            <Headphones className="w-3 h-3 text-purple-600" />
            <span>Sổ tay NotebookLM</span>
            <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
          </a>
          {SMART_ACTION_PROMPTS.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => handleSendMessage(act.prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-900 rounded-md text-[11px] font-medium transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              <span>{act.label}</span>
            </button>
          ))}
        </div>

        {/* Form input */}
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
            placeholder={
              scope === 'in_document'
                ? `Hỏi AI về ${doc.document_number || 'văn bản này'}...`
                : 'Tra cứu câu hỏi trên toàn bộ thư viện pháp luật...'
            }
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

        <p className="text-[9.5px] text-slate-400 text-center">
          AI đối chiếu trực tiếp trên quy phạm pháp luật · Kiểm tra kỹ trước khi áp dụng
        </p>
      </div>
    </div>
  );
}
