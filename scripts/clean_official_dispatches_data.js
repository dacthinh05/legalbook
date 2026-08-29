/**
 * clean_official_dispatches_data.js
 * 
 * Cleans official dispatches data in src/lib/demo-data.ts:
 * 1. Segregates summary vs full text for CV 1585/QTR-QLDN2 (sets html_content: null, content_status: 'needs-ocr', quality_status: 'partial')
 * 2. Clears statutory effective_date (sets to null) for official dispatches
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/demo-data.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Clean CV 1585/QTR-QLDN2
const cv1585Regex = /("id":\s*"142f2bdd-5039-49d0-a5d8-bd00fa0f4164"[\s\S]*?"effective_date":\s*)"2025-07-15"([\s\S]*?"html_content":\s*)<div[\s\S]*?<\/div>"([\s\S]*?"content_status":\s*)"[^"]+"([\s\S]*?"quality_status":\s*)"[^"]+"([\s\S]*?"source_type":\s*)"[^"]+"/;

// Let's do a direct replacement by matching the exact block
const cv1585Target = `"id": "142f2bdd-5039-49d0-a5d8-bd00fa0f4164"`;
const cv1585Index = content.indexOf(cv1585Target);

if (cv1585Index !== -1) {
  const blockStart = content.lastIndexOf('{', cv1585Index);
  const blockEnd = content.indexOf('\n  },', cv1585Index);
  
  if (blockStart !== -1 && blockEnd !== -1) {
    const oldBlock = content.substring(blockStart, blockEnd + 4);
    
    const newBlock = `{
    "id": "142f2bdd-5039-49d0-a5d8-bd00fa0f4164",
    "title": "Công văn 1585/QTR-QLDN2 về việc hoàn thuế giá trị gia tăng hàng hóa xuất khẩu sau 01/07/2025",
    "document_number": "1585/QTR-QLDN2",
    "document_type": "cong_van",
    "issuing_body": "Cục Thuế tỉnh Quảng Trị",
    "signer": "Nguyễn Trung Thành",
    "issued_date": "2025-07-15",
    "effective_date": null,
    "expiry_date": null,
    "status": "hieu_luc",
    "html_content": null,
    "summary_main": "Hướng dẫn điều kiện và thủ tục hoàn thuế GTGT đầu vào đối với hàng hóa xuất khẩu phát sinh sau thời điểm Luật Thuế GTGT 2024 có hiệu lực (01/07/2025).",
    "summary_new_points": "Hồ sơ hoàn thuế bắt buộc có chứng từ thanh toán qua ngân hàng không dùng tiền mặt và tờ khai hải quan điện tử đã thông quan.",
    "summary_affected_parties": "Doanh nghiệp, kế toán, kiểm toán, cơ quan quản lý.",
    "summary_accounting_impact": "Kế toán xuất khẩu cần theo dõi riêng thuế GTGT đầu vào của hàng xuất khẩu đủ điều kiện hoàn.",
    "summary_audit_impact": null,
    "summary_actions_needed": "Kiểm tra tính hợp lệ của tờ khai xuất khẩu và hóa đơn thương mại điện tử trước khi nộp hồ sơ hoàn thuế.",
    "summary_is_ai_generated": false,
    "official_source_url": "https://thuvienphapluat.vn/cong-van/Thue-Phi-Le-Phi/Cong-van-1585-QTR-QLDN2-2025-hoan-thue-xuat-khau.aspx",
    "is_deleted": false,
    "is_published": true,
    "review_status": "published",
    "view_count": 0,
    "created_by": null,
    "created_at": "2026-08-28T09:08:47.631303+00:00",
    "updated_at": "2026-08-29T02:08:53.988569+00:00",
    "files": [
      {
        "id": "da51e08e-b18e-4171-aed8-89bae1a831ef",
        "version": 1,
        "file_url": "https://pfgxkybzwwuzkyquhpdc.supabase.co/storage/v1/object/public/documents/CV_201585.QTR.QLDN2_20-_20Hoan_20Thue_20xuat_20khau_20sau_201.7.2025.pdf",
        "file_size": 150000,
        "file_type": "pdf",
        "created_at": "2026-08-29T01:47:17.616792+00:00",
        "is_primary": true,
        "document_id": "142f2bdd-5039-49d0-a5d8-bd00fa0f4164",
        "uploaded_by": null,
        "original_filename": "CV 1585.QTR.QLDN2 - Hoan Thue xuat khau sau 1.7.2025.pdf"
      }
    ],
    "content_status": "needs-ocr",
    "quality_status": "partial",
    "source_type": "official-pdf"
  }`;

    content = content.replace(oldBlock, newBlock);
    console.log('✓ Successfully cleaned CV 1585/QTR-QLDN2');
  }
}

// 2. Set effective_date: null for all other official dispatches
const dispatchIds = [
  '881fba84-36f3-49da-aea0-4da028b2febe', // 3643/TNI-QLDN
  '1058ebb4-df31-406e-a3e3-77aa64730ba2', // 3058/TCT-CS
  'b858330e-57c6-442c-a44b-8b5fb19bb2a9', // 572/TNG-QLDN2
  '8a23da83-272f-49e4-a2de-833788861af0', // 1188/TCT-TTKT
];

dispatchIds.forEach(id => {
  const idx = content.indexOf(`"id": "${id}"`);
  if (idx !== -1) {
    const blockEnd = content.indexOf('\n  },', idx);
    const block = content.substring(idx, blockEnd);
    const updatedBlock = block.replace(/"effective_date":\s*"[^"]*"/, '"effective_date": null');
    content = content.substring(0, idx) + updatedBlock + content.substring(blockEnd);
    console.log(`✓ Cleared statutory effective_date for dispatch ${id}`);
  }
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ File demo-data.ts updated successfully.');
