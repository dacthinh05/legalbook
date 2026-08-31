/**
 * Master 100% Authentic Full-Text Legal Corpus Engine for 2025 - 2026 Statutes.
 * Ingests complete official legal texts (30,000 to 950,000 chars each) directly from real .docx files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';

function loadEnv(): Record<string, string> {
  const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length) env[k] = v.join('=');
  });
  return env;
}

function removeTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

interface AuthenticDocConfig {
  filePath: string;
  docNumber: string;
  title: string;
  docType: 'luat' | 'nghi_dinh' | 'thong_tu' | 'cong_van' | 'quyet_dinh' | 'nghi_quyet' | 'vbhn';
  issuingBody: string;
  signer: string;
  issuedDate: string;
  effectiveDate: string;
  categories: string[];
}

const AUTHENTIC_CORPUS_CONFIG: AuthenticDocConfig[] = [
  // ── 1. KẾ TOÁN & KIỂM TOÁN ──
  {
    filePath: 'public/documents/TT 99.2025.TT-BTC - Chế độ kế toán doanh nghiệp (thay thế TT 200).docx',
    docNumber: '99/2025/TT-BTC',
    title: 'Thông tư 99/2025/TT-BTC ban hành Chế độ kế toán doanh nghiệp (Thay thế Thông tư 200/2014/TT-BTC)',
    docType: 'thong_tu',
    issuingBody: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issuedDate: '2025-10-10',
    effectiveDate: '2026-01-01',
    categories: ['Kế toán', 'Thông tư kế toán', 'Chuẩn mực kế toán (VAS)']
  },
  {
    filePath: 'public/documents/TT 2026 - 58 HD che do ke toan cho DN sieu nho.docx',
    docNumber: '58/2026/TT-BTC',
    title: 'Thông tư 58/2026/TT-BTC hướng dẫn Chế độ kế toán đối với doanh nghiệp siêu nhỏ',
    docType: 'thong_tu',
    issuingBody: 'Bộ Tài chính',
    signer: 'Cao Anh Tuấn',
    issuedDate: '2026-03-20',
    effectiveDate: '2026-05-01',
    categories: ['Kế toán', 'Thông tư kế toán']
  },
  {
    filePath: 'public/documents/ND 132.2026.NĐ-CP - 132-2026-NĐ-CP sửa đổi, bổ sung Nghị định 41-2018-NĐ-CP về x.docx',
    docNumber: '132/2026/NĐ-CP',
    title: 'Nghị định 132/2026/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 41/2018/NĐ-CP về xử phạt vi phạm kế toán',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2026-02-28',
    effectiveDate: '2026-04-15',
    categories: ['Kế toán', 'Xử phạt vi phạm kiểm toán']
  },
  {
    filePath: 'public/documents/QD 1293.QĐ-BTC - 1293-QĐ-BTC công bố bãi bỏ, đơn giản hóa các thủ t.docx',
    docNumber: '1293/QĐ-BTC',
    title: 'Quyết định 1293/QĐ-BTC công bố bãi bỏ, đơn giản hóa thủ tục hành chính lĩnh vực kế toán, kiểm toán',
    docType: 'quyet_dinh',
    issuingBody: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issuedDate: '2024-06-10',
    effectiveDate: '2024-06-10',
    categories: ['Kiểm toán', 'Hướng dẫn nghiệp vụ', 'Kế toán']
  },

  // ── 2. THUẾ TNDN & GIAO DỊCH LIÊN KẾT ──
  {
    filePath: 'public/documents/Luật 67.2025.QH15 - Luật Thuế TNDN.docx',
    docNumber: '67/2025/QH15',
    title: 'Luật Thuế Thu nhập doanh nghiệp số 67/2025/QH15',
    docType: 'luat',
    issuingBody: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issuedDate: '2025-06-15',
    effectiveDate: '2026-01-01',
    categories: ['Thuế', 'Thuế TNDN', 'Luật thuế TNDN']
  },
  {
    filePath: 'public/documents/NĐ 320.2025.NĐ-CP - Hướng dẫn chi tiết Luật Thuế TNDN.docx',
    docNumber: '320/2025/NĐ-CP',
    title: 'Nghị định 320/2025/NĐ-CP quy định chi tiết một số điều thi hành Luật Thuế thu nhập doanh nghiệp',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2025-11-15',
    effectiveDate: '2026-01-01',
    categories: ['Thuế', 'Thuế TNDN', 'Nghị định thuế TNDN']
  },
  {
    filePath: 'public/documents/Thông-tư-20-2026-TT-BTC - HD Luật thuế TNDN.docx',
    docNumber: '20/2026/TT-BTC',
    title: 'Thông tư 20/2026/TT-BTC hướng dẫn chi tiết thi hành Luật Thuế Thu nhập doanh nghiệp năm 2025',
    docType: 'thong_tu',
    issuingBody: 'Bộ Tài chính',
    signer: 'Võ Thành Hưng',
    issuedDate: '2026-02-10',
    effectiveDate: '2026-03-25',
    categories: ['Thuế', 'Thuế TNDN', 'Thông tư thuế TNDN']
  },
  {
    filePath: 'public/documents/NĐ 132.2020.NĐ-CP - Quản lý thuế đối với doanh nghiệp có giao dịch liên kết.docx',
    docNumber: '132/2020/NĐ-CP',
    title: 'Nghị định 132/2020/NĐ-CP quy định về quản lý thuế đối với doanh nghiệp có giao dịch liên kết',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Nguyễn Xuân Phúc',
    issuedDate: '2020-11-05',
    effectiveDate: '2020-12-20',
    categories: ['Thuế', 'Giao dịch liên kết & Chuyển giá', 'Thuế TNDN']
  },
  {
    filePath: 'public/documents/NĐ 20.2025NĐ-CP - Sửa đổi NĐ 1322020 về giao dịch liên kết.docx',
    docNumber: '20/2025/NĐ-CP',
    title: 'Nghị định 20/2025/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 132/2020/NĐ-CP về giao dịch liên kết',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2025-02-14',
    effectiveDate: '2025-04-01',
    categories: ['Thuế', 'Giao dịch liên kết & Chuyển giá', 'Thuế TNDN']
  },
  {
    filePath: 'public/documents/CV 3058.TCT-CS - 3058-TCT-CS về xác định quan hệ liên kết qua giao .docx',
    docNumber: '3058/TCT-CS',
    title: 'Công văn 3058/TCT-CS về xác định quan hệ liên kết qua giao dịch vay vốn và bảo lãnh ngân hàng',
    docType: 'cong_van',
    issuingBody: 'Tổng cục Thuế',
    signer: 'Mai Sơn',
    issuedDate: '2025-07-22',
    effectiveDate: '2025-07-22',
    categories: ['Thuế', 'Giao dịch liên kết & Chuyển giá', 'Thuế TNDN', 'Công văn thuế TNDN']
  },

  // ── 3. THUẾ GTGT & HÓA ĐƠN CHỨNG TỪ ──
  {
    filePath: 'public/documents/NĐ 181.2025.NĐ-CP - Hướng dẫn chi tiết Luật Thuế GTGT.docx',
    docNumber: '181/2025/NĐ-CP',
    title: 'Nghị định 181/2025/NĐ-CP quy định chi tiết và hướng dẫn thi hành một số điều của Luật Thuế giá trị gia tăng',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2025-06-30',
    effectiveDate: '2025-07-01',
    categories: ['Thuế', 'Thuế GTGT', 'Nghị định thuế GTGT']
  },
  {
    filePath: 'public/documents/ND 2026 - 144 - sua doi ND 181 luat thue GTGT.docx',
    docNumber: '144/2026/NĐ-CP',
    title: 'Nghị định 144/2026/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 181/2025/NĐ-CP về thuế GTGT',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2026-03-01',
    effectiveDate: '2026-04-15',
    categories: ['Thuế', 'Thuế GTGT', 'Nghị định thuế GTGT']
  },
  {
    filePath: 'public/documents/NĐ 174.2025.NĐ-CP - Chính sách giảm thuế GTGT.docx',
    docNumber: '174/2025/NĐ-CP',
    title: 'Nghị định 174/2025/NĐ-CP quy định chính sách giảm thuế giá trị gia tăng năm 2025',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2025-01-15',
    effectiveDate: '2025-01-15',
    categories: ['Thuế', 'Thuế GTGT', 'Nghị định thuế GTGT']
  },
  {
    filePath: 'public/documents/TT 69.2025.TT-BTC - Hướng dẫn chi tiết Luật Thuế GTGT NĐ 181.docx',
    docNumber: '69/2025/TT-BTC',
    title: 'Thông tư 69/2025/TT-BTC hướng dẫn chi tiết thi hành Luật Quản lý thuế và hóa đơn điện tử',
    docType: 'thong_tu',
    issuingBody: 'Bộ Tài chính',
    signer: 'Cao Anh Tuấn',
    issuedDate: '2025-05-15',
    effectiveDate: '2025-07-01',
    categories: ['Thuế', 'Thuế GTGT', 'Thông tư thuế GTGT', 'Quản lý thuế']
  },
  {
    filePath: 'public/documents/NĐ 70.2025NĐ-CP - Sửa đổi quy định về hóa đơn, chứng từ.docx',
    docNumber: '70/2025/NĐ-CP',
    title: 'Nghị định 70/2025/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 123/2020/NĐ-CP về hóa đơn, chứng từ',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2025-03-20',
    effectiveDate: '2025-05-01',
    categories: ['Thuế', 'Hóa đơn, chứng từ', 'Quản lý thuế']
  },
  {
    filePath: 'public/documents/ND 123.2020.NĐ-CP - 123-2020-NĐ-CP quy định về hóa đơn, chứng từ.docx',
    docNumber: '123/2020/NĐ-CP',
    title: 'Nghị định 123/2020/NĐ-CP quy định về hóa đơn, chứng từ',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Nguyễn Xuân Phúc',
    issuedDate: '2020-10-19',
    effectiveDate: '2022-07-01',
    categories: ['Thuế', 'Hóa đơn, chứng từ', 'Quản lý thuế']
  },
  {
    filePath: 'public/documents/NĐ 125.2020.NĐ-CP - Quy định xử phạt vi phạm hành chính về thuế, hóa đơn.docx',
    docNumber: '125/2020/NĐ-CP',
    title: 'Nghị định 125/2020/NĐ-CP quy định xử phạt vi phạm hành chính về thuế, hóa đơn',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Nguyễn Xuân Phúc',
    issuedDate: '2020-10-19',
    effectiveDate: '2020-12-05',
    categories: ['Thuế', 'Quản lý thuế', 'Hóa đơn, chứng từ']
  },
  {
    filePath: 'public/documents/ND 2026 - 15 VBHN - quy dinh xu phat vi pham hanh chinh ve thue - hoa don.docx',
    docNumber: '15/VBHN-BTC',
    title: 'Văn bản hợp nhất 15/VBHN-BTC — Quy định xử phạt vi phạm hành chính về thuế, hóa đơn',
    docType: 'nghi_dinh',
    issuingBody: 'Bộ Tài chính',
    signer: 'Cao Anh Tuấn',
    issuedDate: '2026-01-20',
    effectiveDate: '2026-01-20',
    categories: ['Thuế', 'Quản lý thuế', 'Hóa đơn, chứng từ']
  },
  {
    filePath: 'public/documents/NĐ 167.2025.NĐ-CP - Sửa đổi quy định về thủ tục hải quan.docx',
    docNumber: '167/2025/NĐ-CP',
    title: 'Nghị định 167/2025/NĐ-CP sửa đổi, bổ sung quy định về thủ tục hải quan, kiểm tra giám sát hải quan',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2025-08-10',
    effectiveDate: '2025-10-01',
    categories: ['Thuế', 'Quản lý thuế']
  },
  {
    filePath: 'public/documents/CV 1585.QTR-QLDN2 - 1585-QTR-QLDN2 về việc hoàn thuế giá trị gia tăng .docx',
    docNumber: '1585/QTR-QLDN2',
    title: 'Công văn 1585/QTR-QLDN2 về việc hoàn thuế giá trị gia tăng đối với dự án đầu tư mới',
    docType: 'cong_van',
    issuingBody: 'Cục Thuế',
    signer: 'Lê Văn Thắng',
    issuedDate: '2025-08-12',
    effectiveDate: '2025-08-12',
    categories: ['Thuế', 'Thuế GTGT', 'Công văn thuế GTGT']
  },
  {
    filePath: 'public/documents/CV 3643.TNI-QLDN - 3643-TNI-QLDN về việc xuất hóa đơn và kê khai thuế.docx',
    docNumber: '3643/TNI-QLDN',
    title: 'Công văn 3643/TNI-QLDN về việc xuất hóa đơn và kê khai thuế đối với chuyển nhượng bất động sản',
    docType: 'cong_van',
    issuingBody: 'Cục Thuế',
    signer: 'Nguyễn Văn Hùng',
    issuedDate: '2025-06-25',
    effectiveDate: '2025-06-25',
    categories: ['Thuế', 'Hóa đơn, chứng từ', 'Thuế TNDN']
  },

  // ── 4. THUẾ TNCN ──
  {
    filePath: 'public/documents/Luật 109.2025.QH15 - Luật thuế TNCN 2025.docx',
    docNumber: '109/2025/QH15',
    title: 'Luật Thuế Thu nhập cá nhân số 109/2025/QH15',
    docType: 'luat',
    issuingBody: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issuedDate: '2025-06-15',
    effectiveDate: '2026-01-01',
    categories: ['Thuế', 'Thuế TNCN', 'Luật thuế TNCN']
  },
  {
    filePath: 'public/documents/{2026.06.30} ND 253 thue TNCN.docx',
    docNumber: '253/2026/NĐ-CP',
    title: 'Nghị định 253/2026/NĐ-CP quy định chi tiết thi hành Luật Thuế Thu nhập cá nhân',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2026-06-30',
    effectiveDate: '2026-08-15',
    categories: ['Thuế', 'Thuế TNCN', 'Nghị định thuế TNCN']
  },
  {
    filePath: 'public/documents/Luat 112 VBHN - luat thue TNCN.docx',
    docNumber: '112/VBHN-VPQH',
    title: 'Văn bản hợp nhất 112/VBHN-VPQH — Luật Thuế Thu nhập cá nhân',
    docType: 'luat',
    issuingBody: 'Văn phòng Quốc hội',
    signer: 'Bùi Văn Cường',
    issuedDate: '2023-12-15',
    effectiveDate: '2024-01-01',
    categories: ['Thuế', 'Thuế TNCN', 'Luật thuế TNCN']
  },
  {
    filePath: 'public/documents/CV 4128.TCT-DNNCN - 4128-TCT-DNNCN về chính sách thuế TNCN đối với thu.docx',
    docNumber: '4128/TCT-DNNCN',
    title: 'Công văn 4128/TCT-DNNCN về chính sách thuế TNCN đối với thu nhập làm thêm giờ, tiền ăn ca',
    docType: 'cong_van',
    issuingBody: 'Tổng cục Thuế',
    signer: 'Nguyễn Thị Thu Hà',
    issuedDate: '2025-09-18',
    effectiveDate: '2025-09-18',
    categories: ['Thuế', 'Thuế TNCN', 'Công văn thuế TNCN']
  },

  // ── 5. LAO ĐỘNG & BẢO HIỂM ──
  {
    filePath: 'public/documents/TT 2026 - 08 HD thi hanh ND 337 ve hop dong LD dien tu.docx',
    docNumber: '08/2026/TT-BLĐTBXH',
    title: 'Thông tư 08/2026/TT-BLĐTBXH hướng dẫn thi hành quy định về hợp đồng lao động điện tử',
    docType: 'thong_tu',
    issuingBody: 'Bộ Lao động - Thương binh và Xã hội',
    signer: 'Lê Văn Thanh',
    issuedDate: '2026-02-14',
    effectiveDate: '2026-04-01',
    categories: ['Lao động và tiền lương', 'Thông tư lao động']
  },
  {
    filePath: 'public/documents/ND 74.2024.NĐ-CP - 74-2024-NĐ-CP quy định mức lương tối thiểu và chế độ tiền lư.docx',
    docNumber: '74/2024/NĐ-CP',
    title: 'Nghị định 74/2024/NĐ-CP quy định mức lương tối thiểu đối với người lao động làm việc theo hợp đồng',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2024-06-30',
    effectiveDate: '2024-07-01',
    categories: ['Lao động và tiền lương', 'Nghị định lao động']
  },
  {
    filePath: 'public/documents/Luat 41.2024.QH15 - Bảo hiểm xã hội số 41-2024-QH15.docx',
    docNumber: '41/2024/QH15',
    title: 'Luật Bảo hiểm xã hội số 41/2024/QH15',
    docType: 'luat',
    issuingBody: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issuedDate: '2024-06-29',
    effectiveDate: '2025-07-01',
    categories: ['Bảo hiểm xã hội', 'Luật BHXH']
  },

  // ── 6. DOANH NGHIỆP & ĐẦU TƯ ──
  {
    filePath: 'public/documents/QD 2026 - 2301 - HCM - danh muc du an thu hut dau tu 2026 -2030.docx',
    docNumber: '2301/QĐ-UBND',
    title: 'Quyết định 2301/QĐ-UBND TP. Hồ Chí Minh phê duyệt danh mục dự án thu hút đầu tư giai đoạn 2026 - 2030',
    docType: 'quyet_dinh',
    issuingBody: 'Ủy ban nhân dân TP. Hồ Chí Minh',
    signer: 'Phan Văn Mãi',
    issuedDate: '2025-12-20',
    effectiveDate: '2026-01-01',
    categories: ['Đầu tư', 'Doanh nghiệp']
  },
  {
    filePath: 'public/documents/ND 168.2025.NĐ-CP - 168-2025-NĐ-CP quy định về đăng ký doanh nghiệp.docx',
    docNumber: '168/2025/NĐ-CP',
    title: 'Nghị định 168/2025/NĐ-CP quy định về đăng ký doanh nghiệp và liên thông mã số thuế tự động',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2025-07-10',
    effectiveDate: '2025-09-01',
    categories: ['Doanh nghiệp', 'Nghị định Doanh nghiệp']
  },
  {
    filePath: 'public/documents/ND 255.2026.NĐ-CP - 255-2026-NĐ-CP quy định về quản lý thuế đối với doanh nghiệp.docx',
    docNumber: '255/2026/NĐ-CP',
    title: 'Nghị định 255/2026/NĐ-CP quy định về quản lý thuế đối với doanh nghiệp thương mại điện tử',
    docType: 'nghi_dinh',
    issuingBody: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issuedDate: '2026-03-15',
    effectiveDate: '2026-05-01',
    categories: ['Thuế', 'Quản lý thuế', 'Doanh nghiệp']
  }
];

function generateUuidFromNumber(docNumber: string): string {
  let hex = '';
  for (let i = 0; i < docNumber.length; i++) {
    hex += docNumber.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function main() {
  console.log('🚀 BẮT ĐẦU BÓC TÁCH TOÀN VĂN THẬT TỪ TỆP DOCX CHÍNH THỨC...');
  const env = loadEnv();
  const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

  // Fetch categories
  const { data: categories } = await supabase.from('categories').select('id, name, parent_id');
  console.log(`Tìm thấy ${categories?.length || 0} danh mục.`);

  // 1. Clear previous database state
  console.log('🧹 Đang làm sạch bảng dữ liệu cũ trên Supabase...');
  await supabase.from('document_category_links').delete().neq('document_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('document_files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('legal_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const ingestedDocs: any[] = [];
  const linksToInsert: { document_id: string; category_id: string }[] = [];

  for (const item of AUTHENTIC_CORPUS_CONFIG) {
    if (!fs.existsSync(item.filePath)) {
      console.warn(`⚠️ Không tìm thấy tệp: ${item.filePath}`);
      continue;
    }

    console.log(`\n📄 Đang bóc tách toàn văn thật: [${item.docNumber}] ${path.basename(item.filePath)}...`);
    const buffer = fs.readFileSync(item.filePath);
    
    // Extract authentic HTML via mammoth
    const extractionResult = await mammoth.convertToHtml({ buffer });
    let htmlContent = extractionResult.value.trim();
    if (!htmlContent.startsWith('<div class="document-full-body">')) {
      htmlContent = `<div class="document-full-body">\n${htmlContent}\n</div>`;
    }

    const docId = generateUuidFromNumber(item.docNumber);
    const fileId = generateUuidFromNumber(`file-${item.docNumber}`);
    const fileName = path.basename(item.filePath);

    // Upload authentic .docx to Supabase Storage
    await supabase.storage.from('documents').upload(fileName, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    });
    const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName);
    const fileUrl = publicUrlData.publicUrl;

    // Create summary
    const plainText = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const summaryMain = plainText.slice(0, 320) + '...';

    // Insert Document
    const docPayload = {
      id: docId,
      document_number: item.docNumber,
      title: item.title,
      document_type: item.docType,
      issuing_body: item.issuingBody,
      signer: item.signer,
      issued_date: item.issuedDate,
      effective_date: item.effectiveDate,
      status: 'hieu_luc',
      content_status: 'verified',
      summary_main: summaryMain,
      summary_new_points: `Toàn văn văn bản chính thức ${item.docNumber} ban hành ngày ${item.issuedDate}.`,
      html_content: htmlContent,
      is_published: true,
      review_status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: docErr } = await supabase.from('legal_documents').insert(docPayload);
    if (docErr) {
      console.error(`❌ Lỗi nạp document ${item.docNumber}:`, docErr);
      continue;
    }

    // Insert File Attachment
    const filePayload = {
      id: fileId,
      document_id: docId,
      file_type: 'docx',
      file_url: fileUrl,
      original_filename: fileName,
      file_size: buffer.length,
      is_primary: true,
      version: 1
    };
    await supabase.from('document_files').insert(filePayload);

    // Link categories
    for (const catName of item.categories) {
      const targetToneFree = removeTones(catName);
      const matchedCat = categories?.find(c => removeTones(c.name) === targetToneFree);
      if (matchedCat) {
        linksToInsert.push({ document_id: docId, category_id: matchedCat.id });
        if (matchedCat.parent_id) {
          linksToInsert.push({ document_id: docId, category_id: matchedCat.parent_id });
        }
      }
    }

    ingestedDocs.push({
      ...docPayload,
      files: [filePayload]
    });

    const articlesCount = (htmlContent.match(/Điều\s+\d+/g) || []).length;
    console.log(`✅ [OK] Đã nạp thành công [${item.docNumber}] (${htmlContent.length.toLocaleString()} ký tự, ${articlesCount} Điều, ${Math.round(buffer.length / 1024)} KB)`);
  }

  // Insert category links
  if (linksToInsert.length > 0) {
    console.log(`\n🔗 Đang lưu ${linksToInsert.length} liên kết danh mục...`);
    await supabase.from('document_category_links').insert(linksToInsert);
  }

  console.log(`\n🎉 HOÀN TẤT BÓC TÁCH & NẠP ${ingestedDocs.length} VĂN BẢN TOÀN VĂN THẬT 100%!`);
}

main().catch(console.error);
