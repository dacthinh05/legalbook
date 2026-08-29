/**
 * demo-effects.ts
 * 
 * Benchmark Curated & Verified Legal Effects Dataset for LegalBook.
 * Covers classic legal amendment, replacement, and guidance relationships across Vietnamese law.
 */

import type { LegalEffect } from '@/types';

export const DEMO_LEGAL_EFFECTS: LegalEffect[] = [
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
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Điều 1 Nghị quyết số 110/2025/UBTVQH15",
    sourceExcerpt: "Điều chỉnh mức giảm trừ đối với đối tượng nộp thuế là 15,5 triệu đồng/tháng và mỗi người phụ thuộc là 6,2 triệu đồng/tháng.",
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
    effectiveFrom: "2026-06-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Điều 2 Thông tư số 42/2026/TT-BTC",
    sourceExcerpt: "Toàn bộ khoản tiền lương làm thêm giờ (tăng ca), tiền lương làm việc ban đêm là thu nhập được miễn 100% thuế thu nhập cá nhân.",
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
    effectiveFrom: "2026-05-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Khoản 1 Điều 1 Nghị định 144/2026/NĐ-CP",
    sourceExcerpt: "Sửa đổi, bổ sung quy định về chứng từ thanh toán không dùng tiền mặt và hóa đơn điện tử khởi tạo từ máy tính tiền.",
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
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Khoản 2 Điều 1 Luật số 76/2025/QH15",
    sourceExcerpt: "Bổ sung khái niệm chủ sở hữu hưởng lợi và cơ chế xác thực người đại diện theo pháp luật qua ứng dụng VNeID.",
    sourceUrl: "https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Luat-Doanh-nghiep-2020-59-2020-QH14.aspx",
    anchor: {
      id: "anc-2",
      legalEffectId: "eff-76-59-enterprise",
      targetProvisionId: "dieu-4",
      exactText: "Người đại diện theo pháp luật của doanh nghiệp",
      prefixText: "quy định về",
      suffixText: "và trách nhiệm thực hiện quyền, nghĩa vụ",
      contentHash: "h_76_ent",
      resolutionStatus: "resolved",
    },
    previousContent: "Người đại diện theo pháp luật của doanh nghiệp là cá nhân đại diện cho doanh nghiệp thực hiện các quyền và nghĩa vụ.",
    replacementContent: "Người đại diện theo pháp luật của doanh nghiệp phải được xác thực danh tính điện tử mức 2 trên ứng dụng VNeID và khai báo chủ sở hữu hưởng lợi.",
    reviewStatus: "verified",
    confidence: 0.96,
  },
  {
    id: "eff-255-132-gdlk",
    category: "application_support",
    effectType: "guides",
    sourceDocumentId: "8ea00d09-efda-4832-aaf0-7b43e459b9c8", // ND 255/2026
    sourceDocumentNumber: "255/2026/NĐ-CP",
    sourceDocumentTitle: "Nghị định 255/2026/NĐ-CP quy định về quản lý thuế đối với doanh nghiệp có giao dịch liên kết",
    targetDocumentId: "27391d5a-3d79-40dd-a0bc-af04c2d8aed8", // ND 132/2020
    targetDocumentNumber: "132/2020/NĐ-CP",
    targetProvisionId: "dieu-5",
    targetProvisionLabel: "Điều 5. Các bên có quan hệ liên kết",
    effectiveFrom: "2026-07-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Điều 5 Nghị định 255/2026/NĐ-CP",
    sourceExcerpt: "Hướng dẫn chi tiết khống chế chi phí lãi vay không quá 30% EBITDA đối với các bên có quan hệ liên kết qua tổ chức tín dụng.",
    sourceUrl: "https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Nghi-dinh-132-2020-ND-CP-quy-dinh-quan-ly-thue-doi-voi-doanh-nghiep-co-giao-dich-lien-ket.aspx",
    anchor: {
      id: "anc-3",
      legalEffectId: "eff-255-132-gdlk",
      targetProvisionId: "dieu-5",
      exactText: "Các bên có quan hệ liên kết",
      prefixText: "Quy định cụ thể về",
      suffixText: "trong các trường hợp sau đây",
      contentHash: "h_255_gdlk",
      resolutionStatus: "resolved",
    },
    reviewStatus: "verified",
    confidence: 0.95,
  },
  {
    id: "eff-20-320-cit",
    category: "application_support",
    effectType: "guides",
    sourceDocumentId: "6dc5e0af-c0cf-489a-a51d-c317aa4eb941", // TT 20/2026
    sourceDocumentNumber: "20/2026/TT-BTC",
    sourceDocumentTitle: "Thông tư 20/2026/TT-BTC hướng dẫn chi tiết thi hành Luật Thuế Thu nhập doanh nghiệp và Nghị định 320/2025/NĐ-CP",
    targetDocumentId: "22e82ce9-73ea-4b1f-a849-4ee010809730", // ND 320/2025
    targetDocumentNumber: "320/2025/NĐ-CP",
    targetProvisionId: "dieu-8",
    targetProvisionLabel: "Điều 8. Thu nhập miễn thuế",
    effectiveFrom: "2026-06-01",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Thông tư 20/2026/TT-BTC",
    sourceExcerpt: "Hướng dẫn hồ sơ, thủ tục áp dụng chính sách miễn thuế TNDN đối với thu nhập từ chuyển nhượng chứng chỉ giảm phát thải carbon.",
    sourceUrl: "https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Thong-tu-20-2026-TT-BTC-huong-dan-thue-TNDN.aspx",
    anchor: {
      id: "anc-4",
      legalEffectId: "eff-20-320-cit",
      targetProvisionId: "dieu-8",
      exactText: "Thu nhập miễn thuế",
      prefixText: "Quy định về các khoản",
      suffixText: "áp dụng cho doanh nghiệp công nghệ cao",
      contentHash: "h_20_cit",
      resolutionStatus: "resolved",
    },
    reviewStatus: "verified",
    confidence: 0.94,
  },
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
    effectiveFrom: "2026-04-15",
    effectiveTo: null,
    impactScope: "text_range",
    legalCitation: "Thông tư 121/2026/TT-BKHĐT",
    sourceExcerpt: "Bổ sung mẫu Phụ lục II-1A về kê khai thông tin chủ sở hữu hưởng lợi của doanh nghiệp có vốn đầu tư nước ngoài.",
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
