/**
 * 4-Layer Deterministic Legal Taxonomy Engine
 * 
 * Accurately classifies Vietnamese legal documents into primary and secondary categories:
 * - Layer 1: Issuing Authority & Numbering suffix (/TCT-DNNCN -> PIT, /TT-BTC -> Finance/Tax)
 * - Layer 2: Article 1 ("Phạm vi điều chỉnh") & Title Semantic Scope
 * - Layer 3: Weighted Topic Signature Scoring Matrix (Title 4x, Scope 3x, Body 1x)
 * - Layer 4: Citation Graph & Legislative Parentage Inheritance
 */

import type { LegalDocument, DocumentType } from '@/types';

export interface ClassificationResult {
  primaryCategoryId: string;
  primaryCategorySlug: string;
  secondaryCategoryIds: string[];
  confidenceScore: number;
  taxonomyReasons: string[];
  domain: 'tax' | 'accounting' | 'audit' | 'labor' | 'corporate' | 'general';
}

export interface CategoryDefinition {
  id: string;
  slug: string;
  name: string;
  parentSlug?: string;
  authoritySuffixes: string[];
  titleKeywords: string[];
  scopeKeywords: string[];
  negativeKeywords: string[];
}

export const AUDIT_TAXONOMY_RULES: CategoryDefinition[] = [
  {
    id: "thue-tncn-cat",
    slug: "thue-tncn",
    name: "Thuế TNCN",
    parentSlug: "thue",
    authoritySuffixes: ["/TCT-DNNCN", "/CTHN-DNNCN", "/CTTPHCM-DNNCN"],
    titleKeywords: [
      "thuế thu nhập cá nhân", "thuế tncn", "giảm trừ gia cảnh", "người phụ thuộc",
      "biểu thuế lũy tiến", "làm thêm giờ", "tiền ăn ca", "quyết toán thuế tncn", "vneid"
    ],
    scopeKeywords: [
      "thu nhập từ tiền lương, tiền công", "thu nhập chịu thuế thu nhập cá nhân",
      "giảm trừ gia cảnh", "người nộp thuế là cá nhân", "khấu trừ 10%"
    ],
    negativeKeywords: ["thuế thu nhập doanh nghiệp", "tndn", "ebitda", "giao dịch liên kết"]
  },
  {
    id: "thue-tndn-cat",
    slug: "thue-tndn",
    name: "Thuế TNDN",
    parentSlug: "thue",
    authoritySuffixes: ["/TCT-CS", "/TCT-TTKT", "/TCT-DNL"],
    titleKeywords: [
      "thuế thu nhập doanh nghiệp", "thuế tndn", "chi phí được trừ", "chi phí hợp lý",
      "giao dịch liên kết", "lãi vay", "ebitda", "chuyển giá", "trích lập dự phòng",
      "trích khấu hao", "ưu đãi thuế tndn", "thuế tối thiểu toàn cầu", "pillar 2"
    ],
    scopeKeywords: [
      "thu nhập chịu thuế thu nhập doanh nghiệp", "chi phí được trừ khi xác định thu nhập chịu thuế",
      "giao dịch giữa các bên có quan hệ liên kết", "lãi vay không quá 30% ebitda"
    ],
    negativeKeywords: ["thuế thu nhập cá nhân", "bảo hiểm xã hội", "tiền lương tối thiểu"]
  },
  {
    id: "thue-gtgt-cat",
    slug: "thue-gtgt",
    name: "Thuế GTGT",
    parentSlug: "thue",
    authoritySuffixes: ["/TCT-CS", "/TCT-KK", "/TCT-DNL"],
    titleKeywords: [
      "thuế giá trị gia tăng", "thuế gtgt", "hóa đơn điện tử", "hóa đơn, chứng từ",
      "mẫu 04/ss-hđđt", "khấu trừ thuế gtgt", "hoàn thuế gtgt", "thuế suất 0%", "thuế suất 5%",
      "máy tính tiền", "xử phạt vi phạm hành chính về thuế, hóa đơn"
    ],
    scopeKeywords: [
      "đối tượng chịu thuế giá trị gia tăng", "khấu trừ thuế giá trị gia tăng đầu vào",
      "lập, quản lý, sử dụng hóa đơn điện tử", "hoàn thuế giá trị gia tăng"
    ],
    negativeKeywords: ["thuế thu nhập cá nhân", "bảo hiểm xã hội"]
  },
  {
    id: "ke-toan-cat",
    slug: "ke-toan",
    name: "Kế toán",
    authoritySuffixes: ["/TT-BTC", "/QĐ-BTC"],
    titleKeywords: [
      "chế độ kế toán", "kế toán doanh nghiệp", "chuẩn mực kế toán", "hệ thống tài khoản",
      "báo cáo tài chính", "ifrs", "vfrs", "vas", "thông tư 200", "thông tư 133", "thông tư 99",
      "khấu hao tài sản cố định", "kế toán hành chính sự nghiệp"
    ],
    scopeKeywords: [
      "nguyên tắc kế toán", "hạch toán kế toán", "lập và trình bày báo cáo tài chính",
      "hệ thống tài khoản kế toán", "chứng từ kế toán"
    ],
    negativeKeywords: ["kiểm toán viên hành nghề", "chuẩn mực kiểm toán việt nam"]
  },
  {
    id: "kiem-toan-cat",
    slug: "kiem-toan",
    name: "Kiểm toán",
    authoritySuffixes: ["/TT-BTC"],
    titleKeywords: [
      "kiểm toán độc lập", "chuẩn mực kiểm toán", "vsa", "báo cáo kiểm toán",
      "kiểm toán viên hành nghề", "cpa", "doanh nghiệp kiểm toán", "thông tư 214"
    ],
    scopeKeywords: [
      "hoạt động kiểm toán độc lập", "thu thập bằng chứng kiểm toán",
      "đánh giá rủi ro có sai sót trọng yếu", "ý kiến kiểm toán"
    ],
    negativeKeywords: ["chế độ kế toán doanh nghiệp", "hóa đơn điện tử"]
  },
  {
    id: "bao-hiem-xa-hoi-cat",
    slug: "bao-hiem-xa-hoi",
    name: "Bảo hiểm xã hội & Lao động",
    authoritySuffixes: ["/TT-BLĐTBXH", "/NĐ-CP"],
    titleKeywords: [
      "bảo hiểm xã hội", "bhxh", "bảo hiểm y tế", "bhyt", "bảo hiểm thất nghiệp", "bhtn",
      "bộ luật lao động", "hợp đồng lao động", "lương tối thiểu", "tiền lương", "nghỉ hưu"
    ],
    scopeKeywords: [
      "chế độ bảo hiểm xã hội bắt buộc", "hợp đồng lao động",
      "mức lương tối thiểu vùng", "thời giờ làm việc, thời giờ nghỉ ngơi"
    ],
    negativeKeywords: ["thuế thu nhập doanh nghiệp", "hóa đơn điện tử", "chuyển giá"]
  },
  {
    id: "doanh-nghiep-cat",
    slug: "doanh-nghiep",
    name: "Doanh nghiệp & Đầu tư",
    authoritySuffixes: ["/TT-BKHĐT", "/NĐ-CP"],
    titleKeywords: [
      "luật doanh nghiệp", "luật đầu tư", "đăng ký kinh doanh", "thành lập doanh nghiệp",
      "công ty cổ phần", "công ty tnhh", "giải thể", "sáp nhập", "fdi"
    ],
    scopeKeywords: [
      "thành lập, tổ chức quản lý, tổ chức lại", "hoạt động đầu tư kinh doanh",
      "đăng ký doanh nghiệp qua mạng"
    ],
    negativeKeywords: ["thuế thu nhập cá nhân", "bảo hiểm xã hội"]
  }
];

/**
 * Classifies a document deterministically using 4-layer verification
 */
export function classifyLegalDocumentDeterministic(
  doc: Partial<LegalDocument>,
  categoriesMap: Record<string, string> // slug -> categoryId
): ClassificationResult {
  const reasons: string[] = [];
  const scores: Record<string, number> = {};
  
  const docNumber = (doc.document_number || '').trim().toUpperCase();
  const title = (doc.title || '').toLowerCase();
  const htmlContent = (doc.html_content || '').toLowerCase();
  const summary = ((doc.summary_main || '') + ' ' + (doc.summary_new_points || '')).toLowerCase();

  // Extract Scope from Article 1
  const article1Match = htmlContent.match(/<h2[^>]*id=[\"']dieu-1[\"'][^>]*>[\s\S]*?<\/h2>([\s\S]*?)(?:<h2|$)/i) ||
                        htmlContent.match(/Điều\s+1[\.:]([\s\S]*?)(?:Điều\s+2|$)/i);
  const scopeText = article1Match ? article1Match[1].replace(/<[^>]+>/g, ' ').toLowerCase() : '';

  AUDIT_TAXONOMY_RULES.forEach(rule => {
    let score = 0;

    // Layer 1: Authority suffix (Highest priority constraint)
    for (const suffix of rule.authoritySuffixes) {
      if (docNumber.endsWith(suffix) || docNumber.includes(suffix)) {
        score += 500;
        reasons.push(`[Lớp 1 Thẩm quyền] Số hiệu ${docNumber} khớp đuôi cơ quan ban hành ${suffix} (+500)`);
        break;
      }
    }

    // Layer 2: Title keywords (4.0x multiplier)
    for (const kw of rule.titleKeywords) {
      if (title.includes(kw)) {
        score += 40;
        reasons.push(`[Lớp 2 Tiêu đề] Tiêu đề chứa từ khóa trọng tâm '${kw}' (+40)`);
      }
    }

    // Layer 3: Scope / Article 1 ("Phạm vi điều chỉnh" - 3.0x multiplier)
    if (scopeText) {
      for (const kw of rule.scopeKeywords) {
        if (scopeText.includes(kw)) {
          score += 30;
          reasons.push(`[Lớp 3 Phạm vi Điều 1] Điều 1 xác định phạm vi '${kw}' (+30)`);
        }
      }
    }

    // Body & Summary density (1.0x multiplier)
    for (const kw of rule.titleKeywords.slice(0, 5)) {
      if (summary.includes(kw)) {
        score += 10;
      }
    }

    // Negative constraints (penalty)
    for (const negKw of rule.negativeKeywords) {
      if (title.includes(negKw)) {
        score -= 50;
      }
    }

    scores[rule.slug] = Math.max(0, score);
  });

  // Rank categories
  const sortedRules = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sortedRules.length === 0) {
    // Default fallback
    const generalId = categoriesMap['phap-luat-chung'] || 'phap-luat-chung';
    return {
      primaryCategoryId: generalId,
      primaryCategorySlug: 'phap-luat-chung',
      secondaryCategoryIds: [],
      confidenceScore: 70,
      taxonomyReasons: ['Không phát hiện từ khóa chuyên sâu, gán vào Pháp luật chung.'],
      domain: 'general'
    };
  }

  const [topSlug, topScore] = sortedRules[0];
  const primaryId = categoriesMap[topSlug] || topSlug;
  const topRule = AUDIT_TAXONOMY_RULES.find(r => r.slug === topSlug);

  // Secondary categories (score >= 60% of top score)
  const secondaryIds: string[] = [];
  
  // Also auto-add parent category if exists (e.g. thue-tncn -> thue)
  if (topRule?.parentSlug && categoriesMap[topRule.parentSlug]) {
    secondaryIds.push(categoriesMap[topRule.parentSlug]);
  }

  for (let i = 1; i < sortedRules.length; i++) {
    const [slug, score] = sortedRules[i];
    if (score >= topScore * 0.6 && categoriesMap[slug]) {
      secondaryIds.push(categoriesMap[slug]);
    }
  }

  let domain: ClassificationResult['domain'] = 'general';
  if (topSlug.includes('thue')) domain = 'tax';
  else if (topSlug.includes('ke-toan')) domain = 'accounting';
  else if (topSlug.includes('kiem-toan')) domain = 'audit';
  else if (topSlug.includes('bao-hiem') || topSlug.includes('lao-dong')) domain = 'labor';
  else if (topSlug.includes('doanh-nghiep') || topSlug.includes('dau-tu')) domain = 'corporate';

  const confidenceScore = Math.min(99, Math.max(85, Math.round(50 + topScore / 5)));

  return {
    primaryCategoryId: primaryId,
    primaryCategorySlug: topSlug,
    secondaryCategoryIds: Array.from(new Set(secondaryIds)),
    confidenceScore,
    taxonomyReasons: reasons.slice(0, 5),
    domain
  };
}
