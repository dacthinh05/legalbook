'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LegalDocument } from '@/types';
import type { CrossDocAnalysisResult, StoredAnalysisSession } from './types';
import { computeDocumentContentHash } from './analysis-engine';

const STORAGE_KEY = 'legalbook_cross_doc_analysis_sessions_v1';

/**
 * Reads all stored analysis sessions from localStorage.
 */
export function getStoredSessions(): StoredAnalysisSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredAnalysisSession[];
  } catch (e) {
    console.warn('Failed to parse stored cross-doc analysis sessions:', e);
    return [];
  }
}

/**
 * Saves or updates an analysis session in localStorage.
 */
export function saveAnalysisSession(result: CrossDocAnalysisResult): StoredAnalysisSession {
  const sessions = getStoredSessions();
  const docVersionHashes: Record<string, string> = {};

  for (const d of result.selectedDocuments) {
    docVersionHashes[d.id] = d.contentVersionHash || '0';
  }

  const newSession: StoredAnalysisSession = {
    id: result.id,
    title: result.title,
    savedAt: new Date().toISOString(),
    primaryDocId: result.primaryDocId,
    docIds: result.selectedDocIds,
    objective: result.objective,
    customQuestion: result.customQuestion,
    result,
    docVersionHashes,
  };

  const existingIdx = sessions.findIndex((s) => s.id === result.id);
  let updated: StoredAnalysisSession[];
  if (existingIdx >= 0) {
    updated = [...sessions];
    updated[existingIdx] = newSession;
  } else {
    updated = [newSession, ...sessions].slice(0, 30); // Store up to 30 recent sessions
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save cross-doc analysis session to localStorage:', e);
  }

  return newSession;
}

/**
 * Deletes an analysis session from localStorage.
 */
export function deleteAnalysisSession(id: string): void {
  const sessions = getStoredSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to delete analysis session:', e);
  }
}

/**
 * Checks if a stored analysis session is stale (i.e. if any source document content or status changed).
 */
export function checkIsSessionStale(
  session: StoredAnalysisSession | CrossDocAnalysisResult,
  currentDocs: LegalDocument[]
): boolean {
  if (!session) return false;

  const hashes: Record<string, string> =
    'docVersionHashes' in session && session.docVersionHashes
      ? session.docVersionHashes
      : 'selectedDocuments' in session && Array.isArray((session as CrossDocAnalysisResult).selectedDocuments)
      ? Object.fromEntries(
          ((session as CrossDocAnalysisResult).selectedDocuments || []).map((d: { id: string; contentVersionHash?: string }) => [d.id, d.contentVersionHash || '0'])
        )
      : {};

  for (const doc of currentDocs) {
    if (hashes[doc.id]) {
      const currentHash = computeDocumentContentHash(doc);
      if (currentHash !== hashes[doc.id]) {
        return true; // Document content or status has changed!
      }
    }
  }

  return false;
}

/**
 * Generates an exportable report in Markdown, Plain Text, or JSON.
 */
export function exportAnalysisReport(
  result: CrossDocAnalysisResult,
  format: 'markdown' | 'text' | 'json' = 'markdown'
): string {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (format === 'text') {
    const lines: string[] = [
      `=== ${result.title.toUpperCase()} ===`,
      `Ngày tạo: ${new Date(result.createdAt).toLocaleString('vi-VN')}`,
      `Mô hình phân tích: ${result.model}`,
      `Văn bản chính: ${result.selectedDocuments[0]?.document_number || '---'} - ${result.selectedDocuments[0]?.title || ''}`,
      `Văn bản đối chiếu: ${result.selectedDocuments.slice(1).map((d) => d.document_number || d.title).join(' | ')}`,
      '',
      '--- A. KẾT LUẬN NGẮN ---',
      result.executiveConclusion,
      '',
      '--- B. VAI TRÒ CỦA TỪNG VĂN BẢN ---',
      ...result.documentRoles.map(
        (r) => `* [${r.documentNumber}] ${r.title}\n  - Vai trò: ${r.role}\n  - Phạm vi: ${r.scope}\n  - Trạng thái: ${r.legalStatus}`
      ),
      '',
      '--- C. ĐIỂM GIỐNG VÀ KHÁC ---',
      ...result.comparisonMatrix.map((m) => {
        const docVals = Object.entries(m.docValues)
          .map(([docId, val]) => {
            const doc = result.selectedDocuments.find((d) => d.id === docId);
            return `  - ${doc?.document_number || docId}: ${val}`;
          })
          .join('\n');
        return `* ${m.topic}\n${docVals}\n  => Nhận xét: ${m.remarks}`;
      }),
      '',
      '--- D. TÁC ĐỘNG THỰC TẾ ---',
      'Đối tượng chịu tác động:',
      ...result.practicalImpact.affectedParties.map((p) => `  - ${p}`),
      'Điều kiện phải đáp ứng:',
      ...result.practicalImpact.conditionsToMeet.map((c) => `  - ${c}`),
      'Hồ sơ cần lưu trữ:',
      ...result.practicalImpact.requiredDossier.map((d) => `  - ${d}`),
      'Rủi ro pháp lý & thuế:',
      ...result.practicalImpact.complianceRisks.map((r) => `  - ${r}`),
      '',
      '--- E. ĐIỂM CHƯA CHẮC CHẮN & CẢNH BÁO ---',
      ...result.uncertaintiesAndWarnings.map((w) => `* [${w.title}]: ${w.description}`),
      '',
      '--- F. NGUỒN DẪN CHIẾU ---',
      ...result.citations.map((c) => `* ${c.fullCitationText}\n  "${c.snippet}"`),
    ];
    return lines.join('\n');
  }

  // Markdown format (Rich Report)
  const lines: string[] = [
    `# BÁO CÁO PHÂN TÍCH LIÊN VĂN BẢN PHÁP LÝ`,
    `> **Thời gian tạo:** ${new Date(result.createdAt).toLocaleString('vi-VN')} | **Engine:** ${result.model} | **Mục tiêu:** ${result.objective}`,
    '',
    `### 📋 Danh sách văn bản phân tích:`,
    ...result.selectedDocuments.map(
      (d, i) =>
        `${i + 1}. **${d.document_number || d.title}** — *${d.title}* (${d.status === 'hieu_luc' ? '🟢 Đang có hiệu lực' : '🔴 Hết hiệu lực'})`
    ),
    '',
    `---`,
    `## A. Kết luận ngắn`,
    `${result.executiveConclusion}`,
    '',
    `## B. Vai trò của từng văn bản`,
    `| Văn bản | Vai trò | Phạm vi | Trạng thái |`,
    `| :--- | :--- | :--- | :--- |`,
    ...result.documentRoles.map(
      (r) => `| **${r.documentNumber}** | ${r.role} | ${r.scope} | ${r.legalStatus} |`
    ),
    '',
    `## C. Điểm giống và khác`,
    ...result.comparisonMatrix.map((m) => {
      const docRows = Object.entries(m.docValues)
        .map(([docId, val]) => {
          const doc = result.selectedDocuments.find((d) => d.id === docId);
          return `- **${doc?.document_number || 'Văn bản'}:** ${val}`;
        })
        .join('\n');
      return `### ${m.topic}\n${docRows}\n\n💡 **Nhận xét:** ${m.remarks}\n`;
    }),
    `## D. Tác động thực tế`,
    `#### 👥 Đối tượng chịu tác động:`,
    ...result.practicalImpact.affectedParties.map((p) => `- ${p}`),
    '',
    `#### ✅ Điều kiện phải đáp ứng:`,
    ...result.practicalImpact.conditionsToMeet.map((c) => `- ${c}`),
    '',
    `#### 📁 Hồ sơ cần lưu trữ:`,
    ...result.practicalImpact.requiredDossier.map((d) => `- ${d}`),
    '',
    `#### ⚠️ Rủi ro nếu áp dụng sai:`,
    ...result.practicalImpact.complianceRisks.map((r) => `- ${r}`),
    '',
    `## E. Điểm chưa chắc chắn & Cảnh báo pháp lý`,
    ...result.uncertaintiesAndWarnings.map((w) => `- **${w.title}:** ${w.description}`),
    '',
    `## F. Nguồn dẫn chiếu quy phạm`,
    ...result.citations.map(
      (c) => `- **${c.fullCitationText}**\n  > "${c.snippet}"`
    ),
    '',
    `---`,
    `*Báo cáo được xuất tự động từ Hệ sinh thái Tra cứu & Phân tích Pháp luật LegalBook.*`,
  ];

  return lines.join('\n');
}

/**
 * Custom React hook to manage saved analysis sessions.
 */
export function useAnalysisSessions(primaryDocId?: string) {
  const [sessions, setSessions] = useState<StoredAnalysisSession[]>(() => getStoredSessions());

  const refreshSessions = useCallback(() => {
    setSessions(getStoredSessions());
  }, []);

  const save = useCallback((result: CrossDocAnalysisResult) => {
    const saved = saveAnalysisSession(result);
    refreshSessions();
    return saved;
  }, [refreshSessions]);

  const remove = useCallback((id: string) => {
    deleteAnalysisSession(id);
    refreshSessions();
  }, [refreshSessions]);

  const savedSessionsForDoc = useMemo(() => {
    if (!primaryDocId) return sessions;
    return sessions.filter((s) => s.primaryDocId === primaryDocId || s.docIds.includes(primaryDocId));
  }, [sessions, primaryDocId]);

  return {
    sessions,
    savedSessionsForDoc,
    saveSession: save,
    deleteSession: remove,
    refreshSessions,
    exportReport: exportAnalysisReport,
    checkStale: checkIsSessionStale,
  };
}
