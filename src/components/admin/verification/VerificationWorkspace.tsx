'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ShieldCheck,
  FileText,
  GitFork,
  Layers,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Undo2,
  X,
  AlertCircle,
} from 'lucide-react';
import { verificationService } from '@/lib/verification/data-service';
import type {
  DocumentVerificationRecord,
  VerificationTabType,
  VerificationField,
  RelationshipVerificationItem,
  ChangesetDiffItem,
  VerificationAuditEntry,
} from '@/lib/verification/types';
import { QueuePanel } from './QueuePanel';
import { CompareWorkspace } from './CompareWorkspace';
import { ReviewInspector } from './ReviewInspector';
import { RelationshipVerificationTab } from './RelationshipVerificationTab';
import { ChangesetVerificationTab } from './ChangesetVerificationTab';
import { AuditLogTab } from './AuditLogTab';

export function VerificationWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // URL Tab handling (?type=document | ?type=relationship | ?type=changeset | ?type=audit)
  const tabParam = searchParams.get('type');
  const initialTab: VerificationTabType =
    tabParam === 'relationship' || tabParam === 'queue'
      ? 'relationship'
      : tabParam === 'changeset' || tabParam === 'changesets'
      ? 'changeset'
      : tabParam === 'audit' || tabParam === 'logs'
      ? 'audit'
      : 'documents';

  const [activeTab, setActiveTab] = useState<VerificationTabType>(initialTab);

  // State loaded from verification service
  const [documents, setDocuments] = useState<DocumentVerificationRecord[]>(() =>
    verificationService.getDocuments()
  );
  const [relationships, setRelationships] = useState<RelationshipVerificationItem[]>(() =>
    verificationService.getRelationships()
  );
  const [changesets, setChangesets] = useState<ChangesetDiffItem[]>(() =>
    verificationService.getChangesets()
  );
  const [auditLogs, setAuditLogs] = useState<VerificationAuditEntry[]>(() =>
    verificationService.getAuditLogs()
  );

  // Selected document & active field in inspector
  const [selectedDocId, setSelectedDocId] = useState<string>(
    () => documents[0]?.id || ''
  );
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);

  // Layout sizing & collapse states (with localStorage persistence)
  const [queueWidth, setQueueWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('legalbook_queue_width');
      return saved ? parseInt(saved, 10) : 320;
    }
    return 320;
  });

  const [inspectorWidth, setInspectorWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('legalbook_inspector_width');
      return saved ? parseInt(saved, 10) : 360;
    }
    return 360;
  });

  const [isQueueCollapsed, setIsQueueCollapsed] = useState<boolean>(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState<boolean>(false);

  // Resizing drag states
  const [isResizingQueue, setIsResizingQueue] = useState<boolean>(false);
  const [isResizingInspector, setIsResizingInspector] = useState<boolean>(false);

  // Feedback toast & Undo banner
  const [feedbackToast, setFeedbackToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
    canUndo?: boolean;
  } | null>(null);

  // Unsaved changes confirmation dialog
  const [pendingNavigationDocId, setPendingNavigationDocId] = useState<string | null>(null);
  const [pendingNavigationTab, setPendingNavigationTab] = useState<VerificationTabType | null>(null);

  const currentDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  // Refresh state helper
  const refreshAllState = useCallback(() => {
    setDocuments([...verificationService.getDocuments()]);
    setRelationships([...verificationService.getRelationships()]);
    setChangesets([...verificationService.getChangesets()]);
    setAuditLogs([...verificationService.getAuditLogs()]);
  }, []);

  // Sync tab with URL search parameter
  const handleTabChange = (tab: VerificationTabType) => {
    if (currentDoc?.isDirty) {
      setPendingNavigationTab(tab);
      return;
    }
    setActiveTab(tab);
    const paramVal =
      tab === 'documents'
        ? 'document'
        : tab === 'relationship'
        ? 'relationship'
        : tab === 'changeset'
        ? 'changeset'
        : 'audit';

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('type', paramVal);
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  // Safe document selection with unsaved changes check
  const handleSelectDocument = useCallback(
    (targetDocId: string) => {
      if (targetDocId === selectedDocId) return;

      if (currentDoc?.isDirty) {
        setPendingNavigationDocId(targetDocId);
        return;
      }
      setSelectedDocId(targetDocId);
      setActiveFieldKey(null);
    },
    [currentDoc?.isDirty, selectedDocId]
  );

  // Keyboard navigation (J / Down = Next, K / Up = Prev)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (activeTab !== 'documents') return;

      const currentIndex = documents.findIndex((d) => d.id === selectedDocId);
      if (currentIndex === -1) return;

      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < documents.length - 1) {
          handleSelectDocument(documents[currentIndex + 1].id);
        }
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          handleSelectDocument(documents[currentIndex - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, documents, selectedDocId, handleSelectDocument]);

  // Resizing mouse move & up listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingQueue) {
        const newWidth = Math.max(260, Math.min(460, e.clientX - 260)); // Offset for admin sidebar
        setQueueWidth(newWidth);
        localStorage.setItem('legalbook_queue_width', String(newWidth));
      } else if (isResizingInspector) {
        const newWidth = Math.max(300, Math.min(520, window.innerWidth - e.clientX));
        setInspectorWidth(newWidth);
        localStorage.setItem('legalbook_inspector_width', String(newWidth));
      }
    };

    const handleMouseUp = () => {
      if (isResizingQueue) setIsResizingQueue(false);
      if (isResizingInspector) setIsResizingInspector(false);
    };

    if (isResizingQueue || isResizingInspector) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingQueue, isResizingInspector]);

  // --- Actions ---

  const handleSaveDraft = (
    updatedFields: Record<string, Partial<VerificationField>>,
    notes?: string
  ) => {
    if (!currentDoc) return;
    const updated = verificationService.saveDocumentDraft(currentDoc.id, updatedFields, notes);
    refreshAllState();
    if (updated) {
      setFeedbackToast({
        message: `Đã lưu bản sửa nháp cho văn bản ${updated.document.document_number || ''}.`,
        type: 'success',
      });
      setTimeout(() => setFeedbackToast(null), 3500);
    }
  };

  const handleVerifyDocument = (autoPublish: boolean) => {
    if (!currentDoc) return;
    const result = verificationService.verifyDocument(currentDoc.id, autoPublish);
    if (!result.success) {
      setFeedbackToast({
        message: result.error || 'Không thể xác nhận văn bản.',
        type: 'error',
      });
      setTimeout(() => setFeedbackToast(null), 4000);
      return;
    }

    refreshAllState();

    setFeedbackToast({
      message: `Đã xác nhận thành công văn bản ${currentDoc.document.document_number || ''}.${
        autoPublish ? ' Đã tự động xuất bản.' : ' (Chờ bước xuất bản riêng).'
      }`,
      type: 'success',
      canUndo: true,
    });
    setTimeout(() => setFeedbackToast(null), 5000);

    // Auto-advance to next document in queue without resetting to top
    const currentIndex = documents.findIndex((d) => d.id === currentDoc.id);
    if (currentIndex < documents.length - 1) {
      setSelectedDocId(documents[currentIndex + 1].id);
    }
  };

  const handleRejectDocument = (reason: string, notes: string) => {
    if (!currentDoc) return;
    const result = verificationService.rejectDocument(currentDoc.id, reason, notes);
    if (!result.success) {
      setFeedbackToast({
        message: result.error || 'Lỗi khi từ chối văn bản.',
        type: 'error',
      });
      return;
    }

    refreshAllState();

    setFeedbackToast({
      message: `Đã từ chối văn bản ${currentDoc.document.document_number || ''}: ${reason}`,
      type: 'info',
      canUndo: true,
    });
    setTimeout(() => setFeedbackToast(null), 5000);

    const currentIndex = documents.findIndex((d) => d.id === currentDoc.id);
    if (currentIndex < documents.length - 1) {
      setSelectedDocId(documents[currentIndex + 1].id);
    }
  };

  const handleRequestReOcr = (reason: string, notes: string) => {
    if (!currentDoc) return;
    const result = verificationService.requestRerunOcr(currentDoc.id, reason, notes);
    if (!result.success) {
      setFeedbackToast({
        message: result.error || 'Lỗi khi yêu cầu OCR lại.',
        type: 'error',
      });
      return;
    }

    refreshAllState();
    setFeedbackToast({
      message: `Đã gửi yêu cầu chạy lại OCR cho văn bản ${currentDoc.document.document_number || ''}.`,
      type: 'info',
    });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleMarkDuplicate = (notes: string) => {
    if (!currentDoc) return;
    const result = verificationService.markDuplicate(currentDoc.id, notes);
    if (!result.success) {
      setFeedbackToast({
        message: result.error || 'Lỗi khi đánh dấu trùng lặp.',
        type: 'error',
      });
      return;
    }

    refreshAllState();
    setFeedbackToast({
      message: `Đã đánh dấu trùng lặp văn bản ${currentDoc.document.document_number || ''}.`,
      type: 'info',
    });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleUndo = () => {
    const result = verificationService.undoLastAction();
    if (result.success) {
      refreshAllState();
      setFeedbackToast({
        message: result.message || 'Đã hoàn tác hành động thành công.',
        type: 'success',
      });
      setTimeout(() => setFeedbackToast(null), 3000);
    }
  };

  // Relationship handlers
  const handleVerifyRelationship = (
    id: string,
    notes?: string,
    modifiedData?: Partial<RelationshipVerificationItem>
  ) => {
    verificationService.verifyRelationship(id, 'Chuyên viên Pháp chế', notes, modifiedData);
    refreshAllState();
    setFeedbackToast({
      message: 'Đã xác nhận quan hệ pháp lý.',
      type: 'success',
      canUndo: true,
    });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleRejectRelationship = (id: string, reason: string) => {
    verificationService.rejectRelationship(id, reason);
    refreshAllState();
    setFeedbackToast({
      message: 'Đã từ chối quan hệ pháp lý.',
      type: 'info',
    });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleSwapDirection = (id: string) => {
    verificationService.swapRelationshipDirection(id);
    refreshAllState();
    setFeedbackToast({
      message: 'Đã đảo chiều quan hệ (Nguồn ⇄ Đích).',
      type: 'info',
    });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Changeset handlers
  const handleVerifyChangeset = (id: string, notes?: string) => {
    verificationService.verifyChangeset(id, 'Chuyên viên Pháp chế', notes);
    refreshAllState();
    setFeedbackToast({
      message: 'Đã xác nhận Changeset sửa đổi.',
      type: 'success',
    });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Queue Counts
  const pendingDocsCount = documents.filter((d) => d.reviewStatus === 'pending').length;
  const verifiedDocsCount = documents.filter((d) => d.reviewStatus === 'verified').length;
  const rejectedDocsCount = documents.filter((d) => d.reviewStatus === 'rejected').length;

  const pendingRelsCount = relationships.filter((r) => r.review_status === 'pending').length;
  const pendingChangesetsCount = changesets.filter((c) => !c.isVerified).length;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden select-text">
      {/* COMPACT PAGE HEADER */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20 gap-4">
        {/* Left Title & Status */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm text-slate-900 leading-tight">
                  Bàn Kiểm Duyệt Văn Bản & Quan Hệ Pháp Lý
                </h1>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold rounded-full">
                  {pendingDocsCount + pendingRelsCount} chờ xử lý
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Xác minh dữ liệu, nguồn và quan hệ trước khi xuất bản
              </p>
            </div>
          </div>
        </div>

        {/* Center Tabs Bar */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => handleTabChange('documents')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tài liệu ({documents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('relationship')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'relationship'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Quan hệ pháp lý ({relationships.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('changeset')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'changeset'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Changeset ({changesets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('audit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Nhật ký ({auditLogs.length})</span>
          </button>
        </div>

        {/* Right Metric Pills */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-[11px]">
              Chờ duyệt: <strong>{pendingDocsCount}</strong>
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-[11px]">
              Đã xác minh: <strong>{verifiedDocsCount}</strong>
            </span>
            <span className="px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 text-[11px]">
              Từ chối: <strong>{rejectedDocsCount}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* FEEDBACK TOAST / UNDO BANNER */}
      {feedbackToast && (
        <div
          className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md z-30 shrink-0 transition-all ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-700 text-white'
              : feedbackToast.type === 'error'
              ? 'bg-red-700 text-white'
              : 'bg-slate-800 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            ) : feedbackToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-200" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-200" />
            )}
            <span>{feedbackToast.message}</span>
          </div>

          <div className="flex items-center gap-3">
            {feedbackToast.canUndo && (
              <button
                type="button"
                onClick={handleUndo}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Hoàn tác (Undo)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFeedbackToast(null)}
              className="p-1 hover:bg-white/20 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {activeTab === 'documents' && currentDoc && (
          <div className="flex-1 flex overflow-hidden min-h-0 w-full">
            {/* 1. Queue Panel (Left) */}
            <QueuePanel
              documents={documents}
              selectedDocId={selectedDocId}
              onSelectDocument={handleSelectDocument}
              isCollapsed={isQueueCollapsed}
              onToggleCollapse={() => setIsQueueCollapsed(!isQueueCollapsed)}
              width={queueWidth}
            />

            {/* Drag Handle: Queue -> Compare */}
            {!isQueueCollapsed && (
              <div
                onMouseDown={() => setIsResizingQueue(true)}
                className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-400 cursor-col-resize z-20 shrink-0 transition-all"
                title="Kéo để chỉnh độ rộng hàng chờ"
              />
            )}

            {/* 2. Compare Workspace (Center - flex-1 prioritized) */}
            <CompareWorkspace
              documentRecord={currentDoc}
              activeFieldKey={activeFieldKey}
              onSelectField={(key) => setActiveFieldKey(key)}
            />

            {/* Drag Handle: Compare -> Inspector */}
            {!isInspectorCollapsed && (
              <div
                onMouseDown={() => setIsResizingInspector(true)}
                className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-400 cursor-col-resize z-20 shrink-0 transition-all"
                title="Kéo để chỉnh độ rộng Inspector"
              />
            )}

            {/* 3. Review Inspector (Right) */}
            <ReviewInspector
              documentRecord={currentDoc}
              activeFieldKey={activeFieldKey}
              onSelectField={(key) => setActiveFieldKey(key)}
              onSaveDraft={handleSaveDraft}
              onVerify={handleVerifyDocument}
              onReject={handleRejectDocument}
              onRequestReOcr={handleRequestReOcr}
              onMarkDuplicate={handleMarkDuplicate}
              isCollapsed={isInspectorCollapsed}
              onToggleCollapse={() => setIsInspectorCollapsed(!isInspectorCollapsed)}
              width={inspectorWidth}
            />
          </div>
        )}

        {/* TAB 1: RELATIONSHIPS */}
        {activeTab === 'relationship' && (
          <RelationshipVerificationTab
            relationships={relationships}
            onVerifyRelationship={handleVerifyRelationship}
            onRejectRelationship={handleRejectRelationship}
            onSwapDirection={handleSwapDirection}
          />
        )}

        {/* TAB 2: CHANGESETS */}
        {activeTab === 'changeset' && (
          <ChangesetVerificationTab
            changesets={changesets}
            onVerifyChangeset={handleVerifyChangeset}
          />
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'audit' && <AuditLogTab auditLogs={auditLogs} />}
      </div>

      {/* UNSAVED CHANGES CONFIRMATION DIALOG */}
      {(pendingNavigationDocId || pendingNavigationTab) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Thay đổi chưa được lưu
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có các thay đổi metadata chưa lưu trên văn bản{' '}
              <strong className="text-slate-900">{currentDoc?.document.document_number}</strong>.
              Bạn có chắc chắn muốn rời đi mà không lưu?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPendingNavigationDocId(null);
                  setPendingNavigationTab(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Ở lại chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingNavigationDocId) {
                    setSelectedDocId(pendingNavigationDocId);
                    setPendingNavigationDocId(null);
                  }
                  if (pendingNavigationTab) {
                    setActiveTab(pendingNavigationTab);
                    setPendingNavigationTab(null);
                  }
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs"
              >
                Bỏ qua thay đổi & Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
