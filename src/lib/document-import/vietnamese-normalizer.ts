import { NormalizationChange } from './types';

// Legal phrases dictionary: maps unsigned/misspelled normalized lowercase forms to authentic Vietnamese legal terms
const LEGAL_PHRASES_DICT: Array<{
  pattern: RegExp;
  replacement: string;
  confidence: number;
  reason: string;
  type: 'diacritic' | 'spelling';
}> = [
  // Specific typos mentioned in prompt
  {
    pattern: /\bgioi\s*thiey\b/gi,
    replacement: 'giới thiệu',
    confidence: 0.98,
    reason: 'Sửa lỗi chính tả "gioi thiey" thành "giới thiệu"',
    type: 'spelling',
  },
  {
    pattern: /\bgioi\s*thieu\b/gi,
    replacement: 'giới thiệu',
    confidence: 0.95,
    reason: 'Khôi phục dấu cụm từ "giới thiệu"',
    type: 'diacritic',
  },
  {
    pattern: /\bdiem\s*moi\b/gi,
    replacement: 'điểm mới',
    confidence: 0.96,
    reason: 'Khôi phục dấu cụm từ "điểm mới"',
    type: 'diacritic',
  },
  {
    pattern: /\bquy\s*dinh\b/gi,
    replacement: 'quy định',
    confidence: 0.98,
    reason: 'Khôi phục dấu thuật ngữ "quy định"',
    type: 'diacritic',
  },
  {
    pattern: /\bhuong\s*dan\b/gi,
    replacement: 'hướng dẫn',
    confidence: 0.98,
    reason: 'Khôi phục dấu thuật ngữ "hướng dẫn"',
    type: 'diacritic',
  },
  {
    pattern: /\bluat\s*quan\s*ly\s*thue\b/gi,
    replacement: 'Luật Quản lý thuế',
    confidence: 0.99,
    reason: 'Chuẩn hóa tên đạo luật "Luật Quản lý thuế"',
    type: 'diacritic',
  },
  {
    pattern: /\bquan\s*ly\s*thue\b/gi,
    replacement: 'quản lý thuế',
    confidence: 0.99,
    reason: 'Khôi phục dấu chuyên ngành "quản lý thuế"',
    type: 'diacritic',
  },
  {
    pattern: /\bluat\s*thue\s*tncn\b/gi,
    replacement: 'Luật Thuế TNCN',
    confidence: 0.99,
    reason: 'Chuẩn hóa tên đạo luật "Luật Thuế TNCN"',
    type: 'diacritic',
  },
  {
    pattern: /\bluat\s*thue\s*tndn\b/gi,
    replacement: 'Luật Thuế TNDN',
    confidence: 0.99,
    reason: 'Chuẩn hóa tên đạo luật "Luật Thuế TNDN"',
    type: 'diacritic',
  },
  {
    pattern: /\bluat\s*thue\s*gtgt\b/gi,
    replacement: 'Luật Thuế GTGT',
    confidence: 0.99,
    reason: 'Chuẩn hóa tên đạo luật "Luật Thuế GTGT"',
    type: 'diacritic',
  },
  {
    pattern: /\bthue\s*tncn\b/gi,
    replacement: 'thuế TNCN',
    confidence: 0.99,
    reason: 'Khôi phục dấu chuyên ngành "thuế TNCN"',
    type: 'diacritic',
  },
  {
    pattern: /\bthue\s*tndn\b/gi,
    replacement: 'thuế TNDN',
    confidence: 0.99,
    reason: 'Khôi phục dấu chuyên ngành "thuế TNDN"',
    type: 'diacritic',
  },
  {
    pattern: /\bthue\s*gtgt\b/gi,
    replacement: 'thuế GTGT',
    confidence: 0.99,
    reason: 'Khôi phục dấu chuyên ngành "thuế GTGT"',
    type: 'diacritic',
  },
  {
    pattern: /\bkinh\s*phi\s*cong\s*doan\b/gi,
    replacement: 'kinh phí công đoàn',
    confidence: 0.99,
    reason: 'Khôi phục dấu thuật ngữ "kinh phí công đoàn"',
    type: 'diacritic',
  },
  {
    pattern: /\bthu\s*doan\s*phi\s*cong\s*doan\b/gi,
    replacement: 'thu đoàn phí công đoàn',
    confidence: 0.99,
    reason: 'Khôi phục dấu thuật ngữ "thu đoàn phí công đoàn"',
    type: 'diacritic',
  },
  {
    pattern: /\bdong\s*2%\s*kinh\s*phi\s*cong\s*doan\b/gi,
    replacement: 'đóng 2% kinh phí công đoàn',
    confidence: 0.99,
    reason: 'Khôi phục dấu cụm từ "đóng 2% kinh phí công đoàn"',
    type: 'diacritic',
  },
  {
    pattern: /\bquan\s*ly\s*ngoai\s*hoi\b/gi,
    replacement: 'quản lý ngoại hối',
    confidence: 0.98,
    reason: 'Khôi phục dấu thuật ngữ "quản lý ngoại hối"',
    type: 'diacritic',
  },
  {
    pattern: /\bhoat\s*dong\s*dau\s*tu\s*nuoc\s*ngoai\b/gi,
    replacement: 'hoạt động đầu tư nước ngoài',
    confidence: 0.99,
    reason: 'Khôi phục dấu cụm từ "hoạt động đầu tư nước ngoài"',
    type: 'diacritic',
  },
  {
    pattern: /\btai\s*vn\b/gi,
    replacement: 'tại Việt Nam',
    confidence: 0.95,
    reason: 'Mở rộng viết tắt "VN" thành "Việt Nam"',
    type: 'diacritic',
  },
  {
    pattern: /\bkinh\s*doanh\s*dich\s*vu\s*lam\s*thu\s*tuc\s*ve\s*thue\b/gi,
    replacement: 'kinh doanh dịch vụ làm thủ tục về thuế',
    confidence: 0.99,
    reason: 'Khôi phục dấu thuật ngữ "kinh doanh dịch vụ làm thủ tục về thuế"',
    type: 'diacritic',
  },
  {
    pattern: /\bhop\s*dong\s*ld\s*dien\s*tu\b/gi,
    replacement: 'hợp đồng lao động điện tử',
    confidence: 0.97,
    reason: 'Khôi phục dấu & chuẩn hóa "hợp đồng lao động điện tử"',
    type: 'diacritic',
  },
  {
    pattern: /\bche\s*do\s*ke\s*toan\b/gi,
    replacement: 'chế độ kế toán',
    confidence: 0.98,
    reason: 'Khôi phục dấu thuật ngữ "chế độ kế toán"',
    type: 'diacritic',
  },
  {
    pattern: /\bdoanh\s*nghiep\s*sieu\s*nho\b|\bdn\s*sieu\s*nho\b/gi,
    replacement: 'doanh nghiệp siêu nhỏ',
    confidence: 0.98,
    reason: 'Khôi phục dấu thuật ngữ "doanh nghiệp siêu nhỏ"',
    type: 'diacritic',
  },
  {
    pattern: /\bsua\s*doi\b/gi,
    replacement: 'sửa đổi',
    confidence: 0.95,
    reason: 'Khôi phục dấu từ "sửa đổi"',
    type: 'diacritic',
  },
  {
    pattern: /\bbo\s*sung\b/gi,
    replacement: 'bổ sung',
    confidence: 0.95,
    reason: 'Khôi phục dấu từ "bổ sung"',
    type: 'diacritic',
  },
  {
    pattern: /\bxu\s*phat\s*vi\s*pham\s*hanh\s*chinh\b/gi,
    replacement: 'xử phạt vi phạm hành chính',
    confidence: 0.99,
    reason: 'Khôi phục dấu thuật ngữ "xử phạt vi phạm hành chính"',
    type: 'diacritic',
  },
  {
    pattern: /\bve\s*thue\s*,\s*hoa\s*don\b|\bve\s*thue\s*-\s*hoa\s*don\b/gi,
    replacement: 'về thuế, hóa đơn',
    confidence: 0.98,
    reason: 'Khôi phục dấu cụm từ "về thuế, hóa đơn"',
    type: 'diacritic',
  },
  {
    pattern: /\bchuyen\s*nhuong\s*quyen\s*su\s*dung\s*dat\b/gi,
    replacement: 'chuyển nhượng quyền sử dụng đất',
    confidence: 0.99,
    reason: 'Khôi phục dấu thuật ngữ "chuyển nhượng quyền sử dụng đất"',
    type: 'diacritic',
  },
  {
    pattern: /\bxuat\s*hoa\s*don\b/gi,
    replacement: 'xuất hóa đơn',
    confidence: 0.98,
    reason: 'Khôi phục dấu cụm từ "xuất hóa đơn"',
    type: 'diacritic',
  },
  {
    pattern: /\bchi\s*tien\s*mat\s*tren\s*5\s*trieu\s*khong\s*duoc\s*tru\b/gi,
    replacement: 'chi tiền mặt trên 5 triệu không được trừ',
    confidence: 0.99,
    reason: 'Khôi phục dấu nghiệp vụ "chi tiền mặt trên 5 triệu không được trừ"',
    type: 'diacritic',
  },
  {
    pattern: /\bhoan\s*thue\s*xuat\s*khau\b/gi,
    replacement: 'hoàn thuế xuất khẩu',
    confidence: 0.99,
    reason: 'Khôi phục dấu nghiệp vụ "hoàn thuế xuất khẩu"',
    type: 'diacritic',
  },
  {
    pattern: /\bdanh\s*muc\s*du\s*an\s*thu\s*hut\s*dau\s*tu\b/gi,
    replacement: 'danh mục dự án thu hút đầu tư',
    confidence: 0.99,
    reason: 'Khôi phục dấu thuật ngữ "danh mục dự án thu hút đầu tư"',
    type: 'diacritic',
  },
  {
    pattern: /\bgiao\s*dich\s*lien\s*ket\b/gi,
    replacement: 'giao dịch liên kết',
    confidence: 0.98,
    reason: 'Khôi phục dấu thuật ngữ "giao dịch liên kết"',
    type: 'diacritic',
  },
  {
    pattern: /\bchinh\s*sach\s*giam\s*thue\s*gtgt\b/gi,
    replacement: 'chính sách giảm thuế GTGT',
    confidence: 0.99,
    reason: 'Khôi phục dấu thuật ngữ "chính sách giảm thuế GTGT"',
    type: 'diacritic',
  },
  {
    pattern: /\bthu\s*tuc\s*hai\s*quan\b/gi,
    replacement: 'thủ tục hải quan',
    confidence: 0.98,
    reason: 'Khôi phục dấu thuật ngữ "thủ tục hải quan"',
    type: 'diacritic',
  },
  {
    pattern: /\btien\s*su\s*dung\s*dat\b/gi,
    replacement: 'tiền sử dụng đất',
    confidence: 0.98,
    reason: 'Khôi phục dấu thuật ngữ "tiền sử dụng đất"',
    type: 'diacritic',
  },
  {
    pattern: /\btien\s*thue\s*dat\b/gi,
    replacement: 'tiền thuê đất',
    confidence: 0.98,
    reason: 'Khôi phục dấu thuật ngữ "tiền thuê đất"',
    type: 'diacritic',
  },
];

/**
 * Normalizes Vietnamese text and restores diacritics based on legal context.
 * Returns the normalized text and an array of individual tracked NormalizationChange objects.
 */
export function restoreVietnameseLegalText(
  text: string,
  docId: string = 'doc_temp',
  location: string = 'Văn bản'
): {
  normalizedText: string;
  changes: NormalizationChange[];
  overallConfidence: number;
} {
  if (!text) {
    return { normalizedText: '', changes: [], overallConfidence: 1.0 };
  }

  let result = text;
  const changes: NormalizationChange[] = [];
  let changeIndex = 1;

  for (const entry of LEGAL_PHRASES_DICT) {
    const regex = new RegExp(entry.pattern.source, entry.pattern.flags);
    const matches = Array.from(result.matchAll(regex));

    for (const match of matches) {
      const originalMatched = match[0];
      if (originalMatched !== entry.replacement) {
        const changeId = `nc_${docId}_${changeIndex++}`;
        changes.push({
          id: changeId,
          importedDocumentId: docId,
          location,
          originalText: originalMatched,
          suggestedText: entry.replacement,
          changeType: entry.type,
          confidence: entry.confidence,
          reason: entry.reason,
          status: 'pending',
        });
      }
    }

    result = result.replace(entry.pattern, entry.replacement);
  }

  const avgConfidence =
    changes.length > 0
      ? changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length
      : 1.0;

  return {
    normalizedText: result,
    changes,
    overallConfidence: Number(avgConfidence.toFixed(2)),
  };
}
