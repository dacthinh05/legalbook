/**
 * demo-effects.ts
 * 
 * Benchmark Curated & Verified Legal Effects Dataset for LegalBook.
 * Covers classic legal amendment, replacement, and guidance relationships across Vietnamese law.
 */

import type { LegalEffect } from '@/types';

export const DEMO_LEGAL_EFFECTS: LegalEffect[] = [
  // ── 1. Luật Bảo hiểm xã hội 2024 (Luật 41/2024/QH15) — Điều 2 Khoản 1 & Điểm d ──
  {
    id: "eff-bhxh-art2-c1",
    category: "substantive_change",
    effectType: "guides",
    sourceDocumentId: "e1582025-ndcp-4c22-92ab-110000000158",
    sourceDocumentNumber: "158/2025/NĐ-CP",
    sourceDocumentTitle: "Nghị định 158/2025/NĐ-CP quy định chi tiết và hướng dẫn thi hành một số điều của Luật Bảo hiểm xã hội về bảo hiểm xã hội bắt buộc",
    targetDocumentId: "e06f7455-cb19-4251-adde-f305804d759e", // Luật 41/2024/QH15
    targetDocumentNumber: "41/2024/QH15",
    targetProvisionId: "dieu-2",
    targetProvisionLabel: "Điều 2. Đối tượng tham gia bảo hiểm xã hội bắt buộc",
    clauseLabel: "Khoản 1",
    effectiveFrom: "2025-07-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Khoản 1 Điều 3 Nghị định số 158/2025/NĐ-CP",
    sourceProvisionCitation: "Khoản 1 Điều 3 Nghị định số 158/2025/NĐ-CP",
    sourceExcerpt: "Quy định chi tiết điều kiện tham gia BHXH bắt buộc đối với người làm việc theo hợp đồng lao động không trọn thời gian và người quản lý doanh nghiệp.",
    explanationSummary: "Nội dung này được hướng dẫn bởi Khoản 1 Điều 3 Nghị định 158/2025/NĐ-CP về danh mục các đối tượng tham gia BHXH bắt buộc theo hợp đồng lao động không trọn thời gian.",
    sourceUrl: "https://thuvienphapluat.vn/van-ban/Bao-hiem/Luat-Bao-hiem-xa-hoi-2024-557198.aspx",
    anchor: {
      id: "anc-bhxh-art2-c1",
      legalEffectId: "eff-bhxh-art2-c1",
      targetProvisionId: "dieu-2",
      exactText: "Người lao động là công dân Việt Nam thuộc đối tượng tham gia bảo hiểm xã hội bắt buộc bao gồm",
      prefixText: "Điều 2. Đối tượng tham gia bảo hiểm xã hội bắt buộc và bảo hiểm xã hội tự nguyện",
      suffixText: "Người làm việc theo hợp đồng lao động",
      contentHash: "h_bhxh_2_1",
      resolutionStatus: "resolved",
    },
    previousContent: "Đối tượng tham gia BHXH bắt buộc bao gồm người làm việc theo HĐLĐ từ đủ 01 tháng trở lên (theo Luật BHXH 2014).",
    replacementContent: "Mở rộng đối tượng tham gia BHXH bắt buộc đối với chủ hộ kinh doanh, người hoạt động không chuyên trách cấp xã và người làm việc không trọn thời gian có tiền lương từ mức lương tối thiểu vùng trở lên.",
    reviewStatus: "verified",
    confidence: 0.99,
  },
  {
    id: "eff-bhxh-art2-c1-d",
    category: "substantive_change",
    effectType: "guides",
    sourceDocumentId: "e1582025-ndcp-4c22-92ab-110000000158",
    sourceDocumentNumber: "158/2025/NĐ-CP",
    sourceDocumentTitle: "Nghị định 158/2025/NĐ-CP quy định chi tiết và hướng dẫn thi hành một số điều của Luật Bảo hiểm xã hội về bảo hiểm xã hội bắt buộc",
    targetDocumentId: "e06f7455-cb19-4251-adde-f305804d759e", // Luật 41/2024/QH15
    targetDocumentNumber: "41/2024/QH15",
    targetProvisionId: "dieu-2",
    targetProvisionLabel: "Điều 2. Đối tượng tham gia bảo hiểm xã hội bắt buộc",
    clauseLabel: "Khoản 1",
    pointLabel: "Điểm d",
    effectiveFrom: "2025-07-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Khoản 2 Điều 4 Nghị định số 158/2025/NĐ-CP",
    sourceProvisionCitation: "Khoản 2 Điều 4 Nghị định số 158/2025/NĐ-CP",
    sourceExcerpt: "Hướng dẫn chế độ phụ cấp, tiền lương làm căn cứ đóng BHXH bắt buộc đối với sĩ quan, hạ sĩ quan quân đội nhân dân và công an nhân dân.",
    explanationSummary: "Nội dung này được hướng dẫn bởi Nghị định 158/2025/NĐ-CP về chế độ tiền lương và mức đóng BHXH đặc thù của lực lượng vũ trang nhân dân.",
    sourceUrl: "https://thuvienphapluat.vn/van-ban/Bao-hiem/Luat-Bao-hiem-xa-hoi-2024-557198.aspx",
    anchor: {
      id: "anc-bhxh-art2-c1-d",
      legalEffectId: "eff-bhxh-art2-c1-d",
      targetProvisionId: "dieu-2",
      exactText: "Sĩ quan, quân nhân chuyên nghiệp quân đội nhân dân; sĩ quan, hạ sĩ quan nghiệp vụ, sĩ quan, hạ sĩ quan chuyên môn kỹ thuật công an nhân dân",
      prefixText: "Khoản 1 Điều 2",
      suffixText: "người làm công tác cơ yếu",
      contentHash: "h_bhxh_2_1_d",
      resolutionStatus: "resolved",
    },
    previousContent: "Sĩ quan, quân nhân chuyên nghiệp đóng BHXH trên nền lương cấp bậc quân hàm và phụ cấp thâm niên nghề.",
    replacementContent: "Chuẩn hóa bảng lương và phụ cấp theo Nghị quyết số 27-NQ/TW về cải cách chính sách tiền lương khi xác định mức đóng BHXH bắt buộc.",
    reviewStatus: "verified",
    confidence: 0.99,
  },

  // ── 2. Luật Thuế TNCN (Luật 109/2025/QH15) — Điều 19 Giảm trừ gia cảnh ──
  {
    id: "eff-110-pit-allowance",
    category: "substantive_change",
    effectType: "amends",
    sourceDocumentId: "e1102025-ubtv-4c22-92ab-110000000015", // NQ 110/2025
    sourceDocumentNumber: "110/2025/UBTVQH15",
    sourceDocumentTitle: "Nghị quyết số 110/2025/UBTVQH15 về điều chỉnh mức giảm trừ gia cảnh của thuế thu nhập cá nhân",
    targetDocumentId: "cf5f4ca4-16ce-4750-af1b-05e7dfebd14a", // Luật 109/2025
    targetDocumentNumber: "109/2025/QH15",
    targetProvisionId: "dieu-19",
    targetProvisionLabel: "Điều 19. Giảm trừ gia cảnh",
    clauseLabel: "Khoản 1",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Điều 1 Nghị quyết số 110/2025/UBTVQH15",
    sourceProvisionCitation: "Điều 1 Nghị quyết số 110/2025/UBTVQH15",
    sourceExcerpt: "Điều chỉnh mức giảm trừ đối với đối tượng nộp thuế là 15,5 triệu đồng/tháng và mỗi người phụ thuộc là 6,2 triệu đồng/tháng.",
    explanationSummary: "Nội dung này được sửa đổi bởi Điều 1 Nghị quyết 110/2025/UBTVQH15 nâng mức giảm trừ gia cảnh lên 15,5 triệu đồng/tháng cho bản thân và 6,2 triệu đồng/tháng cho người phụ thuộc.",
    sourceUrl: "https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Nghi-quyet-110-2025-UBTVQH15-dieu-chinh-muc-giam-tru-gia-canh-thue-TNCN.aspx",
    anchor: {
      id: "anc-110-pit",
      legalEffectId: "eff-110-pit-allowance",
      targetProvisionId: "dieu-19",
      exactText: "Mức giảm trừ gia cảnh",
      prefixText: "Quy định về",
      suffixText: "đối với thu nhập từ tiền lương, tiền công",
      contentHash: "h_110_pit",
      resolutionStatus: "resolved",
    },
    previousContent: "Mức giảm trừ đối với đối tượng nộp thuế là 11 triệu đồng/tháng (132 triệu đồng/năm); Mức giảm trừ đối với mỗi người phụ thuộc là 4,4 triệu đồng/tháng.",
    replacementContent: "Mức giảm trừ đối với đối tượng nộp thuế là 15,5 triệu đồng/tháng (186 triệu đồng/năm); Mức giảm trừ đối với mỗi người phụ thuộc là 6,2 triệu đồng/tháng.",
    reviewStatus: "verified",
    confidence: 0.99,
  },

  // ── 3. Nghị định 253/2026/NĐ-CP — Điều 4 Thu nhập miễn thuế ──
  {
    id: "eff-42-overtime-pit",
    category: "substantive_change",
    effectType: "guides",
    sourceDocumentId: "e0422026-ttbt-4c22-92ab-110000000042", // TT 42/2026
    sourceDocumentNumber: "42/2026/TT-BTC",
    sourceDocumentTitle: "Thông tư 42/2026/TT-BTC hướng dẫn thi hành một số điều của Luật Thuế Thu nhập cá nhân 2025",
    targetDocumentId: "9dc07e8e-8e8b-4f5e-a7be-440f5e68d601", // ND 253/2026
    targetDocumentNumber: "253/2026/NĐ-CP",
    targetProvisionId: "dieu-4",
    targetProvisionLabel: "Điều 4. Thu nhập được miễn thuế",
    clauseLabel: "Khoản 2",
    effectiveFrom: "2026-06-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Điều 2 Thông tư số 42/2026/TT-BTC",
    sourceProvisionCitation: "Điều 2 Thông tư số 42/2026/TT-BTC",
    sourceExcerpt: "Toàn bộ khoản tiền lương làm thêm giờ (tăng ca), tiền lương làm việc ban đêm là thu nhập được miễn 100% thuế thu nhập cá nhân.",
    explanationSummary: "Nội dung này được hướng dẫn bởi Điều 2 Thông tư 42/2026/TT-BTC miễn 100% thuế TNCN đối với thu nhập từ tiền lương làm thêm giờ (tăng ca) và làm việc ban đêm.",
    sourceUrl: "https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Thong-tu-42-2026-TT-BTC-huong-dan-thue-TNCN.aspx",
    anchor: {
      id: "anc-42-overtime",
      legalEffectId: "eff-42-overtime-pit",
      targetProvisionId: "dieu-4",
      exactText: "Thu nhập từ tiền lương làm thêm giờ",
      prefixText: "Quy định miễn thuế đối với",
      suffixText: "khi chi trả cho người lao động",
      contentHash: "h_42_ot",
      resolutionStatus: "resolved",
    },
    previousContent: "Phần tiền lương, tiền công trả cao hơn do phải làm việc ban đêm, làm thêm giờ theo quy định của pháp luật được miễn thuế.",
    replacementContent: "Toàn bộ 100% tiền lương làm việc ban đêm, tiền lương làm thêm giờ (tăng ca) trả cho người lao động được xác định là thu nhập được miễn thuế TNCN.",
    reviewStatus: "verified",
    confidence: 0.98,
  },

  // ── 4. Nghị định 181/2025/NĐ-CP — Điều 15 Điều kiện khấu trừ thuế GTGT ──
  {
    id: "eff-144-181-vat",
    category: "substantive_change",
    effectType: "amends",
    sourceDocumentId: "881d4718-b188-432f-a4ad-24101d67ece9", // ND 144/2026
    sourceDocumentNumber: "144/2026/NĐ-CP",
    sourceDocumentTitle: "Nghị định 144/2026/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 181/2025/NĐ-CP về thuế GTGT",
    targetDocumentId: "19f221e7-d7d2-400c-a470-6ed59271340c", // ND 181/2025
    targetDocumentNumber: "181/2025/NĐ-CP",
    targetProvisionId: "dieu-15",
    targetProvisionLabel: "Điều 15. Điều kiện khấu trừ thuế GTGT",
    clauseLabel: "Khoản 1",
    effectiveFrom: "2026-05-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Khoản 1 Điều 1 Nghị định 144/2026/NĐ-CP",
    sourceProvisionCitation: "Khoản 1 Điều 1 Nghị định 144/2026/NĐ-CP",
    sourceExcerpt: "Sửa đổi, bổ sung quy định về chứng từ thanh toán không dùng tiền mặt và hóa đơn điện tử khởi tạo từ máy tính tiền.",
    explanationSummary: "Nội dung này được sửa đổi bởi Khoản 1 Điều 1 Nghị định 144/2026/NĐ-CP siết chặt ngưỡng bắt buộc chứng từ thanh toán không dùng tiền mặt từ 20 triệu xuống 05 triệu đồng.",
    sourceUrl: "https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Nghi-dinh-144-2026-ND-CP-sua-doi-Nghi-dinh-181-2025-thue-GTGT.aspx",
    anchor: {
      id: "anc-1",
      legalEffectId: "eff-144-181-vat",
      targetProvisionId: "dieu-15",
      exactText: "Điều kiện khấu trừ thuế giá trị gia tăng đầu vào",
      prefixText: "Quy định chi tiết về",
      suffixText: "đối với hàng hóa, dịch vụ mua vào",
      contentHash: "h_144_vat",
      resolutionStatus: "resolved",
    },
    previousContent: "Chứng từ thanh toán không dùng tiền mặt bắt buộc đối với hàng hóa, dịch vụ mua vào từng lần có giá trị từ 20 triệu đồng trở lên.",
    replacementContent: "Chứng từ thanh toán qua ngân hàng hoặc ví điện tử doanh nghiệp bắt buộc đối với hóa đơn từng lần có giá trị từ 05 triệu đồng trở lên.",
    reviewStatus: "verified",
    confidence: 0.98,
  },

  // ── 5. Luật Doanh nghiệp 2020 (Luật 59/2020/QH14) — Điều 4 Giải thích từ ngữ ──
  {
    id: "eff-76-59-enterprise",
    category: "substantive_change",
    effectType: "amends",
    sourceDocumentId: "ba9cd68b-edb7-42cc-aeda-3d89d12a87cf", // Luật 76/2025
    sourceDocumentNumber: "76/2025/QH15",
    sourceDocumentTitle: "Luật số 76/2025/QH15 sửa đổi, bổ sung một số điều của Luật Doanh nghiệp",
    targetDocumentId: "228983ef-d36a-4e1b-a31c-1d73eb19d939", // Luật Doanh nghiệp 2020
    targetDocumentNumber: "59/2020/QH14",
    targetProvisionId: "dieu-4",
    targetProvisionLabel: "Điều 4. Giải thích từ ngữ",
    clauseLabel: "Khoản 2",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Khoản 2 Điều 1 Luật số 76/2025/QH15",
    sourceProvisionCitation: "Khoản 2 Điều 1 Luật số 76/2025/QH15",
    sourceExcerpt: "Bổ sung khái niệm chủ sở hữu hưởng lợi và cơ chế xác thực người đại diện theo pháp luật qua ứng dụng VNeID.",
    explanationSummary: "Nội dung này được sửa đổi bởi Luật 76/2025/QH15 bổ sung khái niệm chủ sở hữu hưởng lợi và xác thực người đại diện qua VNeID.",
    sourceUrl: "https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Luat-Doanh-nghiep-2020-59-2020-QH14.aspx",
    anchor: {
      id: "anc-2",
      legalEffectId: "eff-76-59-enterprise",
      targetProvisionId: "dieu-4",
      exactText: "Người đại diện theo pháp luật của doanh nghiệp",
      prefixText: "Quy định về thẩm quyền",
      suffixText: "chịu trách nhiệm thực hiện các quyền và nghĩa vụ",
      contentHash: "h_76_ent",
      resolutionStatus: "resolved",
    },
    previousContent: "Người đại diện theo pháp luật đăng ký bằng văn bản giấy và chữ ký vật lý kèm CCCD/Hộ chiếu bản sao chứng thực.",
    replacementContent: "Chấp nhận định danh điện tử mức 2 trên VNeID của người đại diện theo pháp luật; Bắt buộc khai báo thông tin chủ sở hữu hưởng lợi cuối cùng nắm giữ trên 25% vốn điều lệ.",
    reviewStatus: "verified",
    confidence: 0.98,
  },

  // ── 6. Thông tư 68/2025/TT-BKHĐT — Điều 3 Biểu mẫu đăng ký ──
  {
    id: "eff-121-68-bkhdt",
    category: "substantive_change",
    effectType: "supplements",
    sourceDocumentId: "d654cd54-76be-4315-a72c-e8afce03441a", // TT 121/2026
    sourceDocumentNumber: "121/2026/TT-BKHĐT",
    sourceDocumentTitle: "Thông tư 121/2026/TT-BKHĐT sửa đổi, bổ sung biểu mẫu đăng ký doanh nghiệp",
    targetDocumentId: "4b81a97b-2e83-4411-aaee-283add988ca6", // TT 68/2025
    targetDocumentNumber: "68/2025/TT-BKHĐT",
    targetProvisionId: "dieu-3",
    targetProvisionLabel: "Điều 3. Hệ thống biểu mẫu đăng ký",
    clauseLabel: "Khoản 1",
    effectiveFrom: "2026-04-15",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Thông tư 121/2026/TT-BKHĐT",
    sourceProvisionCitation: "Khoản 1 Điều 1 Thông tư số 121/2026/TT-BKHĐT",
    sourceExcerpt: "Bổ sung mẫu Phụ lục II-1A về kê khai thông tin chủ sở hữu hưởng lợi của doanh nghiệp có vốn đầu tư nước ngoài.",
    explanationSummary: "Nội dung này được bổ sung bởi Thông tư 121/2026/TT-BKHĐT ban hành thêm mẫu biểu Phụ lục II-1A về chủ sở hữu hưởng lợi.",
    sourceUrl: "https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Thong-tu-121-2026-TT-BKHDT-bieu-mau-dang-ky-kinh-doanh.aspx",
    anchor: {
      id: "anc-5",
      legalEffectId: "eff-121-68-bkhdt",
      targetProvisionId: "dieu-3",
      exactText: "Biểu mẫu thực hiện thủ tục đăng ký doanh nghiệp",
      prefixText: "Ban hành kèm theo",
      suffixText: "áp dụng trên Cổng thông tin quốc gia",
      contentHash: "h_121_bkh",
      resolutionStatus: "resolved",
    },
    previousContent: "Sử dụng bộ biểu mẫu ban hành kèm theo Thông tư 68/2025/TT-BKHĐT.",
    replacementContent: "Bổ sung mẫu Phụ lục II-1A kê khai chủ sở hữu hưởng lợi và chuẩn hóa mã định danh điện tử doanh nghiệp.",
    reviewStatus: "verified",
    confidence: 0.95,
  },
];

/**
 * Returns all legal effects relevant to a document (either as target or source).
 */
export function getDocumentLegalEffects(documentId: string): LegalEffect[] {
  return DEMO_LEGAL_EFFECTS.filter(
    (e) => e.targetDocumentId === documentId || e.sourceDocumentId === documentId
  );
}

/**
 * Returns legal effects that impact this document as the target.
 */
export function getTargetDocumentLegalEffects(documentId: string): LegalEffect[] {
  return DEMO_LEGAL_EFFECTS.filter((e) => e.targetDocumentId === documentId);
}
