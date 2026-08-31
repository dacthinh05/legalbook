/**
 * audit-situation-dictionary.ts
 * 
 * Audit & Accounting Practical Query Synonym Expansion Table.
 * Maps real-world operational search phrases to candidate document numbers in the corpus.
 * 
 * Safety & Governance:
 * - Operates strictly as a search query expansion mechanism.
 * - Does not inject static unverified legal conclusions or synthetic advice.
 * - All entries are marked with reviewStatus: 'needs_review' pending CPA verification.
 */

export interface PracticalSituationMapping {
  id: string;
  topicTitle: string;
  domain: 'tax_cit' | 'tax_vat' | 'tax_pit' | 'transfer_pricing' | 'accounting_vas_ifrs' | 'audit_vsa' | 'invoices_procedures';
  searchSynonyms: string[];
  candidateDocumentNumbers: string[];
  reviewStatus: 'needs_review' | 'verified';
  updatedAt: string;
}

export const PRACTICAL_AUDIT_SITUATION_MAPPINGS: PracticalSituationMapping[] = [
  {
    id: 'sit-online-ads-foreign-vendor',
    topicTitle: 'Dịch vụ trực tuyến & Quảng cáo từ Nhà cung cấp nước ngoài (Meta, Google, AWS)',
    domain: 'tax_cit',
    searchSynonyms: [
      'quang cao facebook', 'chi phi facebook ads', 'quang cao google',
      'google ads', 'dich vu aws cloud', 'nha cung cap nuoc ngoai',
      'thue nha thau meta google', 'hoa don nha cung cap nuoc ngoai'
    ],
    candidateDocumentNumbers: ['3115/TCT-CS', '96/2015/TT-BTC', '80/2021/TT-BTC'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  },
  {
    id: 'sit-non-cash-payment-threshold',
    topicTitle: 'Chứng từ thanh toán không dùng tiền mặt (Hóa đơn từ 20 triệu đồng)',
    domain: 'tax_cit',
    searchSynonyms: [
      'thanh toan tien mat tren 20 trieu', 'hoa don tren 20tr tien mat',
      'thanh toan khong dung tien mat', 'chung tu qua ngan hang',
      'hoa don nhieu lan trong ngay cung mot nha cung cap', 'chi tien mat tren 5 trieu'
    ],
    candidateDocumentNumbers: ['572/TNG-QLDN2', '78/2014/TT-BTC', '219/2013/TT-BTC', '96/2015/TT-BTC'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  },
  {
    id: 'sit-interest-cap-30-ebitda',
    topicTitle: 'Khống chế chi phí lãi vay giao dịch liên kết (Mức trần 30% EBITDA)',
    domain: 'transfer_pricing',
    searchSynonyms: [
      'khong che lai vay 30%', 'lai vay 30 ebitda', 'chi phi lai vay giao dich lien ket',
      'chuyen tiep lai vay 5 nam', 'cong thuc ebitda', 'khoan 3 dieu 16 nghi dinh 132'
    ],
    candidateDocumentNumbers: ['132/2020/NĐ-CP', '238/TCT-TTKT'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  },
  {
    id: 'sit-bank-borrowing-transfer-pricing',
    topicTitle: 'Quan hệ liên kết qua dư nợ vay vốn ngân hàng vượt 25% vốn chủ sở hữu',
    domain: 'transfer_pricing',
    searchSynonyms: [
      'vay ngan hang co phai giao dich lien ket khong', 'vay tren 25% von chu so huu',
      'diem d khoan 2 dieu 5 nghi dinh 132', 'cong van 238 ve lai vay ngan hang'
    ],
    candidateDocumentNumbers: ['238/TCT-TTKT', '132/2020/NĐ-CP'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  },
  {
    id: 'sit-director-loan-guarantee',
    topicTitle: 'Quan hệ liên kết khi Giám đốc bảo lãnh tài sản cá nhân cho công ty vay vốn',
    domain: 'transfer_pricing',
    searchSynonyms: [
      'giam doc the chap so do cho cong ty vay', 'giam doc bao lanh vay von',
      'diem l khoan 2 dieu 5 nghi dinh 132', 'cong van 1043'
    ],
    candidateDocumentNumbers: ['1043/TCT-TTKT', '132/2020/NĐ-CP'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  },
  {
    id: 'sit-einvoice-correction-rules',
    topicTitle: 'Xử lý hóa đơn điện tử có sai sót (Mẫu 04/SS-HĐĐT & Hóa đơn điều chỉnh/thay thế)',
    domain: 'invoices_procedures',
    searchSynonyms: [
      'xu ly hoa don dien tu sai sot', 'hoa don dieu chinh hay thay the',
      'mau 04/ss-hddt', 'sai ten cong ty dia chi ma so thue', 'sai tien thue don gia'
    ],
    candidateDocumentNumbers: ['123/2020/NĐ-CP', '78/2021/TT-BTC'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  },
  {
    id: 'sit-pos-cash-register-receipt',
    topicTitle: 'Hóa đơn điện tử khởi tạo từ máy tính tiền kết nối cơ quan thuế',
    domain: 'invoices_procedures',
    searchSynonyms: [
      'hoa don may tinh tien', 'hoa don khoi tao tu may tinh tien',
      'nha hang khach san xuat hoa don may tinh tien', 'quyet dinh 4394 tong cuc thue'
    ],
    candidateDocumentNumbers: ['4394/QĐ-TCT', '123/2020/NĐ-CP', '78/2021/TT-BTC'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  },
  {
    id: 'sit-welfare-expenses-limit',
    topicTitle: 'Chi phí phúc lợi người lao động (Trần 01 tháng lương bình quân thực tế)',
    domain: 'tax_cit',
    searchSynonyms: [
      'chi phi phuc loi cho nhan vien', 'chi nghi mat du lich nhan vien',
      'chi dam hieu hy', 'chi khen thuong con nhan vien', 'gioi han 1 thang luong binh quan'
    ],
    candidateDocumentNumbers: ['96/2015/TT-BTC', '78/2014/TT-BTC'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  },
  {
    id: 'sit-fixed-asset-depreciation-standards',
    topicTitle: 'Khung trích khấu hao Tài sản cố định và phân bổ công cụ dụng cụ',
    domain: 'accounting_vas_ifrs',
    searchSynonyms: [
      'tieu chuan tai san co dinh 30 trieu', 'khung thoi gian khau hao tscd',
      'thong tu 45 khau hao', 'thoi gian khau hao xe o to', 'khau hao nha xuong may moc',
      'phan bo cong cu dung cu 242 toi da 36 thang'
    ],
    candidateDocumentNumbers: ['45/2013/TT-BTC', '96/2015/TT-BTC'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  },
  {
    id: 'sit-inventory-bad-debt-provisions',
    topicTitle: 'Trích lập dự phòng giảm giá hàng tồn kho và nợ phải thu khó đòi',
    domain: 'accounting_vas_ifrs',
    searchSynonyms: [
      'trich lap du phong hang ton kho', 'du phong no phai thu kho doi',
      'thong tu 48 trich lap du phong', 'tuoi no qua han 6 thang 1 nam 2 nam'
    ],
    candidateDocumentNumbers: ['48/2019/TT-BTC', '200/2014/TT-BTC'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  },
  {
    id: 'sit-mandatory-audit-criteria',
    topicTitle: 'Đối tượng doanh nghiệp bắt buộc kiểm toán BCTC hàng năm (FDI, Đại chúng, TCTD)',
    domain: 'audit_vsa',
    searchSynonyms: [
      'doanh nghiep nao bat buoc phai kiem toan bctc', 'doanh nghiep fdi bat buoc kiem toan',
      'cong ty dai chung kiem toan', 'dieu 15 luat kiem toan doc lap',
      'thoi han nop bao cao kiem toan 90 ngay'
    ],
    candidateDocumentNumbers: ['67/2011/QH12', '84/2016/NĐ-CP', '41/2018/NĐ-CP'],
    reviewStatus: 'needs_review',
    updatedAt: '2026-08-31T00:00:00Z',
  }
];

/**
 * Matches a raw search query against practical audit situation synonyms and returns candidate document numbers
 */
export function getCandidateDocNumbersForSituation(query: string): string[] {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const queryTerms = cleanQuery.split(/\s+/).filter((t) => t.length > 1);
  const matchedNumbers = new Set<string>();

  for (const item of PRACTICAL_AUDIT_SITUATION_MAPPINGS) {
    let matches = false;
    const titleNorm = item.topicTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (titleNorm.includes(cleanQuery)) {
      matches = true;
    }

    if (!matches) {
      for (const syn of item.searchSynonyms) {
        const synNorm = syn.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (synNorm === cleanQuery || synNorm.includes(cleanQuery) || cleanQuery.includes(synNorm)) {
          matches = true;
          break;
        }
        const hits = queryTerms.filter((t) => synNorm.includes(t)).length;
        if (hits >= 2 && hits >= queryTerms.length * 0.6) {
          matches = true;
          break;
        }
      }
    }

    if (matches) {
      item.candidateDocumentNumbers.forEach((num) => matchedNumbers.add(num));
    }
  }

  return Array.from(matchedNumbers);
}
