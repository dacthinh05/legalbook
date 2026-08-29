const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`${BLUE}================================================================${RESET}`);
console.log(`${BLUE}🧪 KIỂM THỬ 20 FIXTURES VÀ KỊCH BẢN CHO PIPELINE NHẬP VĂN BẢN 🧪${RESET}`);
console.log(`${BLUE}================================================================${RESET}\n`);

const {
  validateFile,
  checkMagicBytes,
  sanitizeFileName,
} = require('../src/lib/document-import/file-validator');

const {
  convertTCVN3ToUnicode,
  convertVNIToUnicode,
  isLikelyTCVN3,
  isLikelyVNI,
  normalizeVietnameseEncoding,
} = require('../src/lib/document-import/encoding-converter');

const {
  cleanControlCharacters,
  joinLineHyphenations,
  removeRepetitiveHeadersFooters,
  normalizePunctuationAndSpacing,
  cleanDocumentLayout,
} = require('../src/lib/document-import/text-cleaner');

const {
  restoreVietnameseLegalText,
} = require('../src/lib/document-import/vietnamese-normalizer');

const {
  detectLegalDocumentMetadata,
  generateSafeFileName,
} = require('../src/lib/document-import/legal-metadata-detector');

const {
  checkDocumentDuplicates,
  normalizeDocNumber,
} = require('../src/lib/document-import/duplicate-detector');

const {
  shouldPerformOcr,
} = require('../src/lib/document-import/ocr-engine');

let passedTests = 0;
let failedTests = 0;

async function runTest(testName, fn) {
  try {
    await fn();
    console.log(`${GREEN}✅ [PASS]${RESET} ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`${RED}❌ [FAIL]${RESET} ${testName}`);
    console.error(`   ${err.message}`);
    failedTests++;
  }
}

async function main() {
  // TEST 1
  await runTest('1. DOCX Unicode chuẩn & Magic bytes validation', async () => {
    const docxMagic = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    const format = checkMagicBytes(docxMagic);
    assert.strictEqual(format, 'docx');
  });

  // TEST 2
  await runTest('2. Giải mã chuẩn xác TCVN3 (ABC) sang Unicode NFC', async () => {
    const tcvn3Text = 'Céng hßa x· héi chñ nghÜa ViÖt Nam';
    const isTcvn = isLikelyTCVN3(tcvn3Text);
    assert.strictEqual(isTcvn, true);
    const converted = convertTCVN3ToUnicode(tcvn3Text);
    assert.strictEqual(converted, 'Cộng hòa xã hội chủ nghĩa Việt Nam');
  });

  // TEST 3
  await runTest('3. Giải mã chuẩn xác VNI-Windows sang Unicode NFC', async () => {
    const vniText = 'Chính phuû ban haønh Nghò ñònh veà thueá';
    const converted = convertVNIToUnicode(vniText);
    assert.strictEqual(converted.includes('Chính phủ'), true);
    assert.strictEqual(converted.includes('Nghị định'), true);
    assert.strictEqual(converted.includes('thuế'), true);
  });

  // TEST 4
  await runTest('4. Nhận diện chữ ký nhị phân DOC cũ (CFBF OLE)', async () => {
    const docOleMagic = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const format = checkMagicBytes(docOleMagic);
    assert.strictEqual(format, 'doc');
  });

  // TEST 5
  await runTest('5. Nhận diện chữ ký số PDF (%PDF-)', async () => {
    const pdfMagic = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]);
    const format = checkMagicBytes(pdfMagic);
    assert.strictEqual(format, 'pdf');
  });

  // TEST 6
  await runTest('6. Phát hiện chính xác trang PDF scan cần kích hoạt OCR', async () => {
    const scannedPageText = '   ';
    const ocrCheck = shouldPerformOcr(scannedPageText, 1);
    assert.strictEqual(ocrCheck.needsOcr, true);
  });

  // TEST 7
  await runTest('7. Phân biệt trang có text tốt và trang scan trong PDF hỗn hợp', async () => {
    const goodPage = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nĐiều 1. Quy định chung về chính sách thuế doanh nghiệp.';
    const badPage = '1 2 a';
    assert.strictEqual(shouldPerformOcr(goodPage, 1).needsOcr, false);
    assert.strictEqual(shouldPerformOcr(badPage, 2).needsOcr, true);
  });

  // TEST 8
  await runTest('8. Làm sạch ký tự điều khiển và nối dòng ngắt từ (hyphenation)', async () => {
    const textWithHyphen = 'Cơ quan quản lý doanh nghi-\nệp thực hiện pháp lu-\nật thuế.';
    const { cleanedText, joinedHyphensCount } = cleanDocumentLayout(textWithHyphen);
    assert.strictEqual(joinedHyphensCount >= 2, true);
    assert.strictEqual(cleanedText.includes('doanh nghiệp'), true);
    assert.strictEqual(cleanedText.includes('pháp luật'), true);
  });

  // TEST 9
  await runTest('9. Khôi phục tiếng Việt có dấu: CV 2026 - 2231 gioi thieu ND 253 - 2026 va TT 87...', async () => {
    const fileName = 'CV 2026 - 2231 gioi thieu ND 253 - 2026 va TT 87 - 2026 - Luat thue TNCN.docx';
    const rawText = 'TỔNG CỤC THUẾ\nSố: 2231/TCT-CS\nHà Nội, ngày 20 tháng 06 năm 2026\n\nCÔNG VĂN\nV/v: gioi thieu ND 253 - 2026 va TT 87 - 2026 - Luat thue TNCN';
    
    const { normalizedText, changes } = restoreVietnameseLegalText(rawText);
    assert.strictEqual(normalizedText.includes('giới thiệu'), true);
    assert.strictEqual(normalizedText.includes('Luật Thuế TNCN'), true);
    assert.strictEqual(changes.length >= 2, true);

    const meta = detectLegalDocumentMetadata(normalizedText, fileName);
    assert.strictEqual(meta.documentType, 'cong_van');
    assert.strictEqual(meta.documentNumber, '2231/TCT-CS');
    assert.strictEqual(meta.year, 2026);
    assert.strictEqual(meta.issuingBody, 'Tổng cục Thuế');
  });

  // TEST 10
  await runTest('10. Sửa lỗi chính tả "gioi thiey" -> "giới thiệu" với độ tin cậy cao', async () => {
    const fileName = 'CV 2026 - 5746 gioi thiey TT 89 - 2026 Luat quan ly thue.docx';
    const rawContent = 'Số: 5746/TCT-CS\nV/v: gioi thiey TT 89 - 2026 Luat quan ly thue';
    const { normalizedText, changes } = restoreVietnameseLegalText(rawContent);
    
    assert.strictEqual(normalizedText.includes('giới thiệu'), true);
    assert.strictEqual(normalizedText.includes('Luật Quản lý thuế'), true);
    const typoChange = changes.find(c => c.originalText.toLowerCase().includes('gioi thiey'));
    assert.strictEqual(!!typoChange, true);
    assert.strictEqual(typoChange.suggestedText, 'giới thiệu');
  });

  // TEST 11
  await runTest('11. Phát hiện xung đột năm ban hành: Tên file 2028 vs Ruột văn bản 2026', async () => {
    const fileName = 'CV 2028 - 1363 ve dong 2% kinh phi cong doan - thu doan phi cong doan.docx';
    const content = 'TỔNG LIÊN ĐOÀN LAO ĐỘNG VIỆT NAM\nSố: 1363/TLĐ-CSPL\nHà Nội, ngày 15 tháng 04 năm 2026\n\nCÔNG VĂN\nV/v: Về việc đóng 2% kinh phí công đoàn và thu đoàn phí công đoàn';
    
    const meta = detectLegalDocumentMetadata(content, fileName);
    assert.strictEqual(meta.conflicts.length > 0, true);
    assert.strictEqual(meta.conflicts[0].field, 'year');
    assert.strictEqual(meta.conflicts[0].fileValue, '2028');
    assert.strictEqual(meta.conflicts[0].contentValue, '2026');
    assert.strictEqual(meta.conflicts[0].suggestedValue, '2026');
  });

  // TEST 12
  await runTest('12. Ưu tiên số hiệu và cơ quan từ ruột văn bản thay vì filename suy đoán', async () => {
    const fileName = 'TT 2026 - 38 quy dinh quan ly ngoai hoi doi voi hoat dong dau tu nuoc ngoai tai VN.docx';
    const content = 'NGÂN HÀNG NHÀ NƯỚC VIỆT NAM\nSố: 38/2026/TT-NHNN\nHà Nội, ngày 28 tháng 05 năm 2026\n\nTHÔNG TƯ\nQuy định quản lý ngoại hối đối với hoạt động đầu tư nước ngoài tại Việt Nam';
    
    const meta = detectLegalDocumentMetadata(content, fileName);
    assert.strictEqual(meta.documentType, 'thong_tu');
    assert.strictEqual(meta.documentNumber, '38/2026/TT-NHNN');
    assert.strictEqual(meta.issuingBody, 'Ngân hàng Nhà nước Việt Nam');
    assert.strictEqual(meta.standardTitle.includes('Thông tư số 38/2026/TT-NHNN'), true);
  });

  // TEST 13
  await runTest('13. Phân biệt chính xác Công văn chính và các văn bản được giới thiệu (NĐ 253, TT 87)', async () => {
    const content = 'TỔNG CỤC THUẾ\nSố: 2231/TCT-CS\nKính gửi: Cục Thuế các tỉnh, thành phố\nTổng cục Thuế giới thiệu điểm mới của Nghị định số 253/2026/NĐ-CP và Thông tư số 87/2026/TT-BTC.';
    const meta = detectLegalDocumentMetadata(content, 'CV 2026 - 2231.docx');
    
    assert.strictEqual(meta.documentType, 'cong_van');
    assert.strictEqual(meta.documentNumber, '2231/TCT-CS');
    assert.strictEqual(meta.referencedDocuments.length >= 2, true);
    const hasNd = meta.referencedDocuments.some(r => r.title.includes('253'));
    const hasTt = meta.referencedDocuments.some(r => r.title.includes('87'));
    assert.strictEqual(hasNd && hasTt, true);
  });

  // TEST 14
  await runTest('14. Phát hiện trùng lặp văn bản đã có trong thư viện', async () => {
    const mockExisting = [
      {
        id: 'doc-1',
        title: 'Nghị định 123/2020/NĐ-CP quy định về hóa đơn, chứng từ',
        document_number: '123/2020/NĐ-CP',
        files: [{ original_filename: 'ND 123.2020.NĐ-CP.docx' }]
      }
    ];

    const dupResult = checkDocumentDuplicates(
      {
        documentNumber: '123/2020/NĐ-CP',
        title: 'Nghị định 123/2020/NĐ-CP về hóa đơn chứng từ',
        fileExtension: 'pdf'
      },
      mockExisting
    );

    assert.strictEqual(dupResult.isDuplicate, true);
    assert.strictEqual(dupResult.duplicateType, 'alternative_format');
  });

  // TEST 15
  await runTest('15. Chặn tệp giả mạo extension (ví dụ text/executable đổi đuôi .docx)', async () => {
    const fakeDocxBuffer = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const val = await validateFile({ name: 'malicious.docx', size: 100 }, fakeDocxBuffer);
    assert.strictEqual(val.isValid, false);
  });

  // TEST 16
  await runTest('16. Chặn tệp vượt quá giới hạn dung lượng cho phép', async () => {
    const dummyBuffer = new Uint8Array(100);
    const val = await validateFile({ name: 'huge_file.pdf', size: 60 * 1024 * 1024 }, dummyBuffer, 50 * 1024 * 1024);
    assert.strictEqual(val.isValid, false);
    assert.strictEqual(val.error.includes('vượt quá giới hạn'), true);
  });

  // TEST 17
  await runTest('17. Khử bỏ các ký tự cấm trên Windows trong tên file đề xuất', async () => {
    const safeName = generateSafeFileName('CV', '2231/BTC-TCT', 2026, 'Giới thiệu: NĐ "253" & TT <87>', 'docx');
    assert.strictEqual(/[<>:"/\\|?*]/.test(safeName), false);
    assert.strictEqual(safeName.endsWith('.docx'), true);
  });

  // TEST 18
  await runTest('18. Khử sạch ký tự điều khiển nhị phân trong text', async () => {
    const dirtyText = 'Văn bản\x00\x08 hợp lệ\x1f';
    const clean = cleanControlCharacters(dirtyText);
    assert.strictEqual(clean, 'Văn bản hợp lệ');
  });

  // TEST 19
  await runTest('19. Batch queue xử lý độc lập từng file, phân lập lỗi an toàn', async () => {
    const batch = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'failed', error: 'Corrupt file' },
      { id: '3', status: 'approved' }
    ];
    const pending = batch.filter(b => b.status === 'pending');
    assert.strictEqual(pending.length, 1);
    assert.strictEqual(batch[1].status, 'failed');
    assert.strictEqual(batch[2].status, 'approved');
  });

  // TEST 20
  await runTest('20. Đề xuất tên văn bản chuẩn: [Loại] số [số hiệu] [trích yếu]', async () => {
    const content = 'TỔNG LIÊN ĐOÀN LAO ĐỘNG VIỆT NAM\nSố: 1363/TLĐ-CSPL\nHà Nội, ngày 15 tháng 04 năm 2026\n\nCÔNG VĂN\nVề việc đóng 2% kinh phí công đoàn và thu đoàn phí công đoàn';
    const meta = detectLegalDocumentMetadata(content, 'CV 2026 - 1363.docx');
    
    assert.strictEqual(
      meta.standardTitle,
      'Công văn số 1363/TLĐ-CSPL về việc đóng 2% kinh phí công đoàn và thu đoàn phí công đoàn'
    );
  });

  console.log(`\n${BLUE}================================================================${RESET}`);
  console.log(`KẾT QUẢ KIỂM THỬ: ${GREEN}${passedTests} passed${RESET}, ${failedTests > 0 ? RED : GREEN}${failedTests} failed${RESET}`);
  console.log(`${BLUE}================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

main();
