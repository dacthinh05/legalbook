import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DocumentType, DocumentStatus, RelationType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  luat: 'Luật',
  nghi_dinh: 'Nghị định',
  thong_tu: 'Thông tư',
  quyet_dinh: 'Quyết định',
  cong_van: 'Công văn',
  chuan_muc: 'Chuẩn mực',
  huong_dan: 'Hướng dẫn',
  khac: 'Khác',
};

export const DOCUMENT_TYPE_ABBREV: Record<DocumentType, string> = {
  luat: 'Luật',
  nghi_dinh: 'NĐ',
  thong_tu: 'TT',
  quyet_dinh: 'QĐ',
  cong_van: 'CV',
  chuan_muc: 'CM',
  huong_dan: 'HD',
  khac: 'Khác',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  hieu_luc: 'Đang có hiệu lực',
  chua_hieu_luc: 'Sắp có hiệu lực',
  het_hieu_luc_mot_phan: 'Thay đổi hiệu lực',
  het_hieu_luc_toan_bo: 'Hết hiệu lực',
  chua_xac_dinh: 'Chưa xác định',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  hieu_luc: 'text-green-700 bg-green-50 border-green-200',
  chua_hieu_luc: 'text-amber-700 bg-amber-50 border-amber-200',
  het_hieu_luc_mot_phan: 'text-orange-700 bg-orange-50 border-orange-200',
  het_hieu_luc_toan_bo: 'text-red-700 bg-red-50 border-red-200',
  chua_xac_dinh: 'text-gray-600 bg-gray-50 border-gray-200',
};

/**
 * Presentation-layer display title helper.
 * Safely removes redundant leading document type and document number prefixes
 * when they are already displayed in the card/header identification line.
 * Does NOT mutate original legal title in database or memory.
 */
export function formatShortTitle(title: string, _docType?: DocumentType | string, docNumber?: string | null): string {
  if (!title) return '';
  let clean = title.trim();

  // 1. If explicit docNumber is provided, strip prefix containing docNumber
  if (docNumber) {
    const escapedNum = docNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startNumRegex = new RegExp(`^(?:Luật|Bộ luật|Nghị định|Thông tư|Quyết định|Công văn|Văn bản hợp nhất)?\\s*(?:số\\s+)?${escapedNum}\\s*[-–—:]?\\s*`, 'iu');
    clean = clean.replace(startNumRegex, '');

    const endNumRegex = new RegExp(`\\s+(?:số\\s+)?${escapedNum}$`, 'iu');
    clean = clean.replace(endNumRegex, '');
  }

  // 2. Strip standard leading type + actual number containing digits
  clean = clean.replace(/^(?:Luật|Bộ luật|Nghị định|Thông tư|Quyết định|Công văn|Văn bản hợp nhất)\s+(?:số\s+)?(?:\d+[\w/.-]*)\s*[-–—:]?\s*/iu, '');

  // 3. Strip leading generic "Luật " when followed by specific law subject (preserving full subject word e.g. "Thuế", "Đất đai")
  clean = clean.replace(/^Luật\s+(Thuế\s+|Đất\s+|Đầu\s+|Doanh\s+|Kế\s+|Kiểm\s+|Bảo\s+|Quản\s+|Khám\s+|Đấu\s+)/iu, '$1');

  clean = clean.trim();
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    return clean;
  }
  return title;
}


export function getEffectiveStatus(doc?: {
  status?: DocumentStatus | null;
  effective_date?: string | null;
  expiry_date?: string | null;
} | null): DocumentStatus {
  if (!doc) return 'chua_xac_dinh';
  const nowStr = new Date().toISOString().split('T')[0];

  if (doc.expiry_date && doc.expiry_date <= nowStr) {
    return 'het_hieu_luc_toan_bo';
  }
  if (doc.status === 'het_hieu_luc_toan_bo' || doc.status === 'het_hieu_luc_mot_phan') {
    return doc.status;
  }
  if (doc.effective_date) {
    if (doc.effective_date > nowStr) {
      return 'chua_hieu_luc';
    } else {
      return 'hieu_luc';
    }
  }
  return doc.status || 'chua_xac_dinh';
}

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  luat: 'text-blue-700 bg-blue-50',
  nghi_dinh: 'text-purple-700 bg-purple-50',
  thong_tu: 'text-teal-700 bg-teal-50',
  quyet_dinh: 'text-orange-700 bg-orange-50',
  cong_van: 'text-gray-700 bg-gray-100',
  chuan_muc: 'text-indigo-700 bg-indigo-50',
  huong_dan: 'text-cyan-700 bg-cyan-50',
  khac: 'text-gray-600 bg-gray-50',
};

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  can_cu: 'Căn cứ vào',
  huong_dan: 'Hướng dẫn',
  sua_doi: 'Sửa đổi',
  thay_the: 'Thay thế',
  bai_bo_toan_bo: 'Bãi bỏ toàn bộ',
  bai_bo_mot_phan: 'Bãi bỏ một phần',
  lien_quan: 'Liên quan',
};

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

export function isNewDocument(updatedAt: string, daysThreshold = 30): boolean {
  const d = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= daysThreshold;
}

/**
 * Safely computes a working Thư Viện Pháp Luật URL.
 * If the official_source_url is a full valid TVPL URL with numeric document ID (e.g. -625881.aspx),
 * it returns that direct URL.
 * Otherwise, it falls back to a targeted Google Search for Thư Viện Pháp Luật with exact keyword quotes,
 * guaranteeing that clicking the link always finds the actual document without 404 "The page you requested was removed" errors.
 */
export function getTvplSourceUrl(doc?: {
  official_source_url?: string | null;
  sourceUrl?: string | null;
  document_number?: string | null;
  title?: string | null;
} | null): string {
  if (!doc) return 'https://thuvienphapluat.vn';

  const rawUrl = (doc.official_source_url || doc.sourceUrl || '').trim();
  if (rawUrl) {
    // Real TVPL article URLs end with -{id}.aspx where id has 4 or more digits
    const hasValidTvplId = /-\d{4,}\.aspx$/i.test(rawUrl);
    if (hasValidTvplId) {
      return rawUrl;
    }
  }

  const query = (doc.document_number || doc.title || '').trim();
  if (!query) return rawUrl || 'https://thuvienphapluat.vn';

  return `https://www.google.com/search?q=${encodeURIComponent(`site:thuvienphapluat.vn "${query}"`)}`;
}

/**
 * Returns a safe, reliable official source URL for any legal document or crawled item.
 * Guarantees no broken/404 ASPX session links when clicked by users.
 */
export function getSafeSourceUrl(doc?: {
  official_source_url?: string | null;
  sourceUrl?: string | null;
  document_number?: string | null;
  title?: string | null;
} | null): string {
  return getTvplSourceUrl(doc);
}

export interface MultiSourceOption {
  id: 'gdt' | 'mof' | 'customs' | 'vbpl' | 'chinhphu' | 'thuvienphapluat';
  name: string;
  domain: string;
  url: string;
  badgeColor: string;
  isOfficialGov: boolean;
  description: string;
}

/**
 * Returns prioritized multi-source lookup links for legal documents and official dispatches.
 * Allows instant cross-checking across official Ministry/Government portals.
 */
export function getMultiSourceLookupUrls(docOrQuery?: {
  document_number?: string | null;
  title?: string | null;
  official_source_url?: string | null;
  document_type?: DocumentType | string | null;
} | string | null): MultiSourceOption[] {
  let query = '';
  let docObj: { document_number?: string | null; title?: string | null; official_source_url?: string | null; document_type?: string | null } | null = null;

  if (typeof docOrQuery === 'string') {
    query = docOrQuery.trim();
  } else if (docOrQuery) {
    docObj = docOrQuery;
    query = (docOrQuery.document_number || docOrQuery.title || '').trim();
  }

  const tvplUrl = docObj ? getTvplSourceUrl(docObj) : (query ? `https://www.google.com/search?q=${encodeURIComponent(`site:thuvienphapluat.vn "${query}"`)}` : 'https://thuvienphapluat.vn');

  return [
    {
      id: 'gdt',
      name: 'Tổng cục Thuế',
      domain: 'gdt.gov.vn',
      url: query ? `https://www.google.com/search?q=${encodeURIComponent(`site:gdt.gov.vn "${query}"`)}` : 'https://www.gdt.gov.vn',
      badgeColor: 'bg-red-50 text-red-700 border-red-200',
      isOfficialGov: true,
      description: 'Cổng thông tin Tổng cục Thuế (Công văn thuế, giải đáp vướng mắc, hoàn thuế)',
    },
    {
      id: 'mof',
      name: 'Bộ Tài chính',
      domain: 'mof.gov.vn',
      url: query ? `https://www.google.com/search?q=${encodeURIComponent(`site:mof.gov.vn "${query}"`)}` : 'https://mof.gov.vn',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      isOfficialGov: true,
      description: 'Cổng thông tin Bộ Tài chính (Chế độ kế toán, kiểm toán, quản lý tài chính)',
    },
    {
      id: 'customs',
      name: 'Tổng cục Hải quan',
      domain: 'customs.gov.vn',
      url: query ? `https://www.google.com/search?q=${encodeURIComponent(`site:customs.gov.vn "${query}"`)}` : 'https://customs.gov.vn',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      isOfficialGov: true,
      description: 'Cổng Tổng cục Hải quan (Công văn mã HS, giá tính thuế, thủ tục XNK)',
    },
    {
      id: 'vbpl',
      name: 'CSDL Quốc gia (VBPL)',
      domain: 'vbpl.vn',
      url: query ? `https://www.google.com/search?q=${encodeURIComponent(`site:vbpl.vn "${query}"`)}` : 'https://vbpl.vn',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      isOfficialGov: true,
      description: 'Cơ sở dữ liệu Quốc gia về Văn bản Pháp luật',
    },
    {
      id: 'chinhphu',
      name: 'Cổng TTĐT Chính Phủ',
      domain: 'vanban.chinhphu.vn',
      url: query ? `https://www.google.com/search?q=${encodeURIComponent(`site:vanban.chinhphu.vn "${query}"`)}` : 'https://vanban.chinhphu.vn',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      isOfficialGov: true,
      description: 'Cổng thông tin điện tử Chính phủ (Nghị định, Nghị quyết, Quyết định TTg)',
    },
    {
      id: 'thuvienphapluat',
      name: 'Thư Viện Pháp Luật',
      domain: 'thuvienphapluat.vn',
      url: tvplUrl,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      isOfficialGov: false,
      description: 'Hệ sinh thái tra cứu văn bản pháp luật tổng hợp',
    },
  ];
}

export type ApplicabilityStatus =
  | 'applicable'
  | 'superseded'
  | 'historical-reference'
  | 'case-specific'
  | 'internal-guidance'
  | 'unknown';

export function getApplicabilityInfo(doc?: {
  document_type?: DocumentType | string;
  status?: DocumentStatus | null;
} | null): { label: string; badgeColor: string; description: string } {
  if (!doc) return { label: 'Chưa xác định', badgeColor: 'text-gray-600 bg-gray-50 border-gray-200', description: '' };

  if (doc.document_type === 'cong_van') {
    return {
      label: 'Hướng dẫn tình huống',
      badgeColor: 'text-amber-800 bg-amber-50 border-amber-300',
      description: 'Phạm vi: Trả lời / hướng dẫn tình huống nghiệp vụ cụ thể — cần đối chiếu với văn bản quy phạm pháp luật tương ứng',
    };
  }

  if (doc.document_type === 'huong_dan') {
    return {
      label: 'Tài liệu hướng dẫn',
      badgeColor: 'text-cyan-800 bg-cyan-50 border-cyan-300',
      description: 'Phạm vi: Hướng dẫn nghiệp vụ chuyên ngành',
    };
  }

  if (doc.document_type === 'chuan_muc') {
    return {
      label: 'Chuẩn mực áp dụng',
      badgeColor: 'text-indigo-800 bg-indigo-50 border-indigo-300',
      description: 'Chuẩn mực kế toán / kiểm toán',
    };
  }

  const status = doc.status || 'chua_xac_dinh';
  return {
    label: DOCUMENT_STATUS_LABELS[status] || 'Chưa xác định',
    badgeColor: DOCUMENT_STATUS_COLORS[status] || 'text-gray-600 bg-gray-50 border-gray-200',
    description: '',
  };
}

export interface VerificationBreakdown {
  metadata: {
    status: 'verified' | 'unverified' | 'needs_review';
    label: string;
    badgeColor: string;
  };
  content: {
    status: 'verified' | 'unverified' | 'missing' | 'needs_ocr' | 'partial';
    label: string;
    badgeColor: string;
  };
  source: {
    status: 'verified' | 'stored_file' | 'stored_url' | 'unverified' | 'none';
    label: string;
    badgeColor: string;
  };
  relationship: {
    status: 'verified' | 'unverified' | 'pending';
    label: string;
    badgeColor: string;
  };
  isFullyMatchedFullText: boolean;
  primaryBadge: {
    label: string;
    badgeColor: string;
    tooltip: string;
  };
}

export function getVerificationBreakdown(doc?: {
  html_content?: string | null;
  content_status?: string | null;
  review_status?: string | null;
  files?: Array<{ file_type?: string; file_url?: string }> | null;
  official_source_url?: string | null;
  source_file_hash?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  metadata_verification_status?: 'verified' | 'unverified' | 'needs_review' | null;
  content_verification_status?: 'verified' | 'unverified' | 'missing' | 'needs_ocr' | 'partial' | null;
  source_verification_status?: 'verified' | 'stored_file' | 'stored_url' | 'unverified' | 'none' | null;
  relationship_verification_status?: 'verified' | 'unverified' | 'pending' | null;
  metadataVerificationStatus?: 'verified' | 'unverified' | 'needs_review' | null;
  contentVerificationStatus?: 'verified' | 'unverified' | 'missing' | 'needs_ocr' | 'partial' | null;
  sourceVerificationStatus?: 'verified' | 'stored_file' | 'stored_url' | 'unverified' | 'none' | null;
  relationshipVerificationStatus?: 'verified' | 'unverified' | 'pending' | null;
} | null): VerificationBreakdown {
  if (!doc) {
    return {
      metadata: { status: 'unverified', label: 'Metadata: Chưa xác minh', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
      content: { status: 'missing', label: 'Toàn văn: Chưa có', badgeColor: 'bg-rose-50 text-rose-800 border-rose-200' },
      source: { status: 'none', label: 'Nguồn: Chưa lưu', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
      relationship: { status: 'unverified', label: 'Quan hệ: Chưa kiểm duyệt', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
      isFullyMatchedFullText: false,
      primaryBadge: { label: 'Chưa kiểm duyệt', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200', tooltip: 'Dữ liệu chưa được quản trị viên đối chiếu đầy đủ với nguồn chính thức.' },
    };
  }

  // 1. Metadata Verification
  const metaStatus = doc.metadata_verification_status || doc.metadataVerificationStatus || 'verified';
  const metaObj = {
    status: metaStatus,
    label: metaStatus === 'verified' ? 'Metadata: Đã xác minh' : metaStatus === 'needs_review' ? 'Metadata: Cần xem lại' : 'Metadata: Chưa xác minh',
    badgeColor: metaStatus === 'verified' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-200',
  };

  // 2. Source Verification
  const hasFiles = Boolean(doc.files && doc.files.length > 0);
  const hasUrl = Boolean(doc.official_source_url);
  let srcStatus = doc.source_verification_status || doc.sourceVerificationStatus;
  if (!srcStatus) {
    if (hasFiles) srcStatus = 'stored_file';
    else if (hasUrl) srcStatus = 'stored_url';
    else srcStatus = 'none';
  }
  const srcObj = {
    status: srcStatus,
    label: srcStatus === 'verified' ? 'Nguồn: Đã xác minh' : srcStatus === 'stored_file' ? 'Nguồn: Đã lưu tệp gốc' : srcStatus === 'stored_url' ? 'Nguồn: Đã lưu URL' : 'Nguồn: Chưa lưu',
    badgeColor: srcStatus === 'verified' || srcStatus === 'stored_file' ? 'bg-blue-50 text-blue-800 border-blue-200' : srcStatus === 'stored_url' ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-slate-100 text-slate-700 border-slate-200',
  };

  // 3. Content Verification
  const hasContent = Boolean(doc.html_content && doc.html_content.trim().length > 0);
  let contentStatus = doc.content_verification_status || doc.contentVerificationStatus;
  if (!contentStatus) {
    if (doc.content_status === 'needs-ocr') contentStatus = 'needs_ocr';
    else if (doc.content_status === 'partial') contentStatus = 'partial';
    else if (!hasContent || doc.content_status === 'not-fetched' || doc.content_status === 'failed') contentStatus = 'missing';
    else if (doc.content_status === 'verified' && doc.verified_by && doc.verified_at) contentStatus = 'verified';
    else contentStatus = hasContent ? 'unverified' : 'missing';
  }

  const contentObj = {
    status: contentStatus,
    label: contentStatus === 'verified' ? 'Toàn văn: Đã đối chiếu toàn văn' : contentStatus === 'needs_ocr' ? 'Toàn văn: Bản scan cần OCR' : contentStatus === 'partial' ? 'Toàn văn: Trích xuất một phần' : contentStatus === 'missing' ? 'Toàn văn: Chưa có' : 'Toàn văn: Chưa kiểm duyệt',
    badgeColor: contentStatus === 'verified' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : contentStatus === 'needs_ocr' ? 'bg-purple-50 text-purple-800 border-purple-200' : contentStatus === 'partial' ? 'bg-amber-50 text-amber-800 border-amber-200' : contentStatus === 'missing' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-sky-50 text-sky-800 border-sky-200',
  };

  // 4. Relationship Verification
  const relStatus = doc.relationship_verification_status || doc.relationshipVerificationStatus || 'unverified';
  const relObj = {
    status: relStatus,
    label: relStatus === 'verified' ? 'Quan hệ: Đã xác minh' : relStatus === 'pending' ? 'Quan hệ: Đang chờ duyệt' : 'Quan hệ: Chưa kiểm duyệt',
    badgeColor: relStatus === 'verified' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-200',
  };

  // Strict Rule: "Đã đối chiếu toàn văn" ONLY when:
  // - Has file/source artifact
  // - Has hash or stored file
  // - Full text exists and verified
  // - Has reviewer & reviewed timestamp
  const isFullyMatchedFullText = Boolean(
    (hasFiles || doc.source_file_hash) &&
    hasContent &&
    doc.verified_by &&
    doc.verified_at &&
    contentStatus === 'verified'
  );

  let primaryBadge = {
    label: 'Chưa kiểm duyệt',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
    tooltip: 'Dữ liệu chưa được quản trị viên đối chiếu đầy đủ với nguồn chính thức.',
  };

  if (isFullyMatchedFullText) {
    primaryBadge = {
      label: '✓ Đã đối chiếu toàn văn',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      tooltip: `Đã đối chiếu toàn văn với tệp gốc bởi ${doc.verified_by || 'Ban biên tập'} vào ${doc.verified_at ? formatDate(doc.verified_at) : 'gần đây'}`,
    };
  } else if (contentStatus === 'missing') {
    primaryBadge = {
      label: 'Thiếu toàn văn',
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
      tooltip: 'Hệ thống hiện chỉ có metadata, chưa có toàn văn số hóa',
    };
  } else if (contentStatus === 'needs_ocr') {
    primaryBadge = {
      label: 'Bản scan PDF',
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
      tooltip: 'Tệp đính kèm là bản scan hình ảnh, cần xử lý OCR để số hóa toàn văn',
    };
  } else if (contentStatus === 'partial') {
    primaryBadge = {
      label: 'Trích xuất một phần',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      tooltip: 'Nội dung số hóa hiện tại có thể thiếu một số điều khoản hoặc phụ lục',
    };
  }

  return {
    metadata: metaObj,
    content: contentObj,
    source: srcObj,
    relationship: relObj,
    isFullyMatchedFullText,
    primaryBadge,
  };
}


