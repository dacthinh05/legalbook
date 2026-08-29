'use client';

import { useState, useCallback } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Filter, 
  GitFork, 
  Edit3, 
  History, 
  Layers,
  ArrowRight,
  FileText,
  Check,
  RotateCcw,
  ExternalLink,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { LegalDocumentAnalyzer } from '@/lib/legal-engine/analyzer';
import type { LegalRelationship, LegalChange } from '@/lib/legal-engine/types';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import { formatLegalHtmlContent } from '@/lib/legal-formatter';
import type { LegalDocument } from '@/types';

export default function VerificationQueuePage() {
  const analyzer = LegalDocumentAnalyzer.getInstance();
  const [relationships, setRelationships] = useState<LegalRelationship[]>(() => analyzer.getQueueRelationships());
  const [changesets, setChangesets] = useState<LegalChange[]>(() => analyzer.getQueueChangesets());
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; relationship_id: string; action: string; reviewer: string; timestamp: string; notes?: string }>>(() => analyzer.getAuditLogs());
  const [unverifiedDocs, setUnverifiedDocs] = useState<LegalDocument[]>(() =>
    (DEMO_DOCUMENTS as unknown as LegalDocument[]).filter(d => d.content_status !== 'verified' || d.review_status !== 'published').slice(0, 10)
  );
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(() => unverifiedDocs[0] || (DEMO_DOCUMENTS as unknown as LegalDocument[])[0] || null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'documents' | 'queue' | 'changesets' | 'audit'>('documents');
  const [selectedRel, setSelectedRel] = useState<LegalRelationship | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const refreshData = useCallback(() => {
    setRelationships([...analyzer.getQueueRelationships()]);
    setChangesets([...analyzer.getQueueChangesets()]);
    setAuditLogs([...analyzer.getAuditLogs()]);
  }, [analyzer]);

  const handleApprove = (id: string) => {
    analyzer.updateReviewStatus(id, 'verified', 'Chuyên viên Kiểm toán & Pháp chế', editNotes);
    refreshData();
    setSelectedRel(null);
    setEditNotes('');
  };

  const handleReject = (id: string) => {
    analyzer.updateReviewStatus(id, 'rejected', 'Chuyên viên Kiểm toán & Pháp chế', editNotes);
    refreshData();
    setSelectedRel(null);
    setEditNotes('');
  };

  const handleNeedMoreInfo = (id: string) => {
    analyzer.updateReviewStatus(id, 'needs-more-information', 'Chuyên viên Kiểm toán & Pháp chế', editNotes);
    refreshData();
    setSelectedRel(null);
    setEditNotes('');
  };

  const filteredRels = relationships.filter(r => {
    if (statusFilter === 'all') return true;
    return r.review_status === statusFilter;
  });

  const pendingCount = relationships.filter(r => r.review_status === 'pending').length;
  const verifiedCount = relationships.filter(r => r.review_status === 'verified').length;
  const rejectedCount = relationships.filter(r => r.review_status === 'rejected').length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 select-text">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
            <ShieldCheck className="w-4 h-4" />
            <span>HỆ THỐNG PHÂN TÍCH & DUYỆT QUAN HỆ PHÁP LUẬT</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-950">
            Hàng chờ Kiểm duyệt Quan hệ & Changeset
          </h1>
          <p className="text-xs text-slate-500">
            Kiểm tra và phê duyệt các mối quan hệ pháp lý, phạm vi sửa đổi và điều khoản tác động được phát hiện bởi Rule Engine.
          </p>
        </div>

        {/* Counter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-amber-700 uppercase">Chờ duyệt</div>
            <div className="text-base font-bold text-amber-900">{pendingCount}</div>
          </div>

          <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-emerald-700 uppercase">Đã xác minh</div>
            <div className="text-base font-bold text-emerald-900">{verifiedCount}</div>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-slate-600 uppercase">Từ chối</div>
            <div className="text-base font-bold text-slate-800">{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 gap-4 flex-wrap pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tài liệu đối chiếu ({unverifiedDocs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>Quan hệ pháp lý ({filteredRels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('changesets')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'changesets'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Changeset sửa đổi ({changesets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Nhật ký duyệt ({auditLogs.length})</span>
          </button>
        </div>
        {/* Status Filter Dropdown */}
        {activeTab === 'queue' && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ kiểm duyệt (Pending)</option>
              <option value="verified">Đã xác minh (Verified)</option>
              <option value="rejected">Đã từ chối (Rejected)</option>
              <option value="needs-more-information">Cần bổ sung thông tin</option>
            </select>
          </div>
        )}
      </div>

      {/* Feedback message */}
      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* TAB 0: DOCUMENTS SIDE-BY-SIDE VERIFICATION */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: List of documents & Metadata Inspection (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Danh sách tài liệu cần xác minh
              </div>
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {unverifiedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      selectedDoc?.id === doc.id
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900">{doc.document_number}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                        Chờ xác minh
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                      {doc.title}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{doc.issuing_body || 'Bộ Tài chính'}</span>
                      <span>•</span>
                      <span>{doc.issued_date || '2026'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata Detail Card */}
            {selectedDoc && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span>Báo cáo Trích xuất & Đối chiếu</span>
                  <span className="text-emerald-700 font-mono">Độ tin cậy: 98%</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Số hiệu</span>
                    <span className="font-mono font-bold text-slate-900">{selectedDoc.document_number}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Cơ quan</span>
                    <span className="font-semibold text-slate-900 truncate block">{selectedDoc.issuing_body || 'Bộ Tài chính'}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Ngày ban hành</span>
                    <span className="text-slate-900">{selectedDoc.issued_date || 'Chưa xác định'}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Ngày hiệu lực</span>
                    <span className="text-slate-900">{selectedDoc.effective_date || 'Chưa xác định'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackMessage(`Đã phê duyệt và xuất bản thành công văn bản ${selectedDoc.document_number}.`);
                      setUnverifiedDocs(prev => prev.filter(d => d.id !== selectedDoc.id));
                      setTimeout(() => setFeedbackMessage(null), 3000);
                    }}
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Duyệt & Xuất bản</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackMessage(`Đã gửi yêu cầu chạy lại OCR cho văn bản ${selectedDoc.document_number}.`);
                      setTimeout(() => setFeedbackMessage(null), 3000);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Chạy lại OCR</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Semantic Layout Preview (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs overflow-hidden flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-900">Xem trước Layout Nghị định 30/2020</span>
              </div>
              {selectedDoc?.official_source_url && (
                <a
                  href={selectedDoc.official_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
                >
                  <span>Mở nguồn gốc</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Rendered HTML Box */}
            <div className="flex-1 overflow-y-auto max-h-[550px] p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              {selectedDoc?.html_content ? (
                <div
                  className="document-content select-text text-slate-800 text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatLegalHtmlContent(selectedDoc.html_content, selectedDoc) }}
                />
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">Chưa có nội dung văn bản để hiển thị.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: RELATIONSHIPS QUEUE */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Relationships (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            {filteredRels.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
                <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">Không có quan hệ nào trong danh sách lọc</p>
              </div>
            ) : (
              filteredRels.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => setSelectedRel(rel)}
                  className={`p-5 bg-white rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    selectedRel?.id === rel.id
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Top line: Badges & Confidence */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${
                        rel.review_status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rel.review_status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rel.review_status === 'verified' ? '✓ Đã xác minh' : rel.review_status === 'rejected' ? '✕ Đã từ chối' : '⏳ Chờ duyệt'}
                      </span>

                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold border border-blue-200">
                        {rel.relationship_type.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 font-mono">
                      <span>Độ tin cậy: <strong className="text-slate-900">{Math.round(rel.confidence * 100)}%</strong></span>
                      <span>•</span>
                      <span>Phương pháp: <strong>{rel.detection_method}</strong></span>
                    </div>
                  </div>

                  {/* Flow: Source -> Target */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs font-semibold">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-normal">Văn bản nguồn:</span>
                      <span className="font-mono text-slate-900">{rel.source_document_number}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="min-w-0 text-right">
                      <span className="text-[10px] text-slate-400 block font-normal">Văn bản đích:</span>
                      <span className="font-mono text-blue-700">{rel.target_document_number || rel.target_document_id}</span>
                    </div>
                  </div>

                  {/* Evidence quote */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[11px] font-bold text-slate-500">Bằng chứng trích dẫn:</span>
                    <blockquote className="p-2.5 bg-amber-50/60 border-l-3 border-amber-400 text-slate-800 rounded-r-lg italic text-[11px]">
                      &ldquo;{rel.evidence_text}&rdquo;
                    </blockquote>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Verification Actions Side Panel (1 col) */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 sticky top-6">
              <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                Hành động Kiểm duyệt
              </h3>

              {selectedRel ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <div className="text-[11px] text-slate-500 font-medium">Đang chọn:</div>
                    <div className="font-mono font-bold text-slate-900">{selectedRel.source_document_number} ➔ {selectedRel.target_document_number}</div>
                    <div className="text-[11px] text-blue-700 font-semibold">{selectedRel.extracted_instruction}</div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">Ghi chú / Nhận xét của người duyệt:</label>
                    <textarea
                      rows={3}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Ghi chú xác minh (ví dụ: đã đối chiếu điều 19 khoản 1 khớp nội dung)..."
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => handleApprove(selectedRel.id)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Phê duyệt (Verified)
                    </button>

                    <button
                      onClick={() => handleNeedMoreInfo(selectedRel.id)}
                      className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Cần bổ sung thông tin
                    </button>

                    <button
                      onClick={() => handleReject(selectedRel.id)}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Từ chối quan hệ này
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-xs text-center py-8">
                  Chọn một quan hệ ở danh sách bên trái để kiểm tra và phê duyệt.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHANGESETS */}
      {activeTab === 'changesets' && (
        <div className="space-y-4">
          {changesets.map((chg) => (
            <div key={chg.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold px-2 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200">
                  THAO TÁC: {chg.operation.toUpperCase()}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Áp dụng từ: {chg.effective_from}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {chg.old_content && (
                  <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-red-700 uppercase">Nội dung cũ (Bị thay/bãi bỏ):</span>
                    <p className="text-red-900 line-through">{chg.old_content}</p>
                  </div>
                )}
                {chg.new_content && (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Nội dung mới thay thế:</span>
                    <p className="text-emerald-900 font-medium">{chg.new_content}</p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500">Vị trí trích xuất: {chg.evidence_location}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3.5">Thời gian</th>
                <th className="p-3.5">Người kiểm duyệt</th>
                <th className="p-3.5">Hành động</th>
                <th className="p-3.5">Mã quan hệ</th>
                <th className="p-3.5">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Chưa có nhật ký duyệt nào trong phiên làm việc hiện tại.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                    <td className="p-3.5 font-bold text-slate-900">{log.reviewer}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        log.action === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 text-[11px]">{log.relationship_id}</td>
                    <td className="p-3.5 text-slate-600">{log.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
