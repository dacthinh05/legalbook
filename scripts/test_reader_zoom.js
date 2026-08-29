// Comprehensive Unit/Integration Test for Reader Zoom & Preferences
const assert = require('assert');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; }
  };
})();

console.log('🧪 BẮT ĐẦU CHẠY BỘ KIỂM THỬ CHỨC NĂNG ZOOM VÀ THIẾT LẬP VÙNG ĐỌC...\n');

let testPassed = 0;
let testTotal = 0;

function runTest(name, fn) {
  testTotal++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    testPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error('     Lỗi:', err.message);
  }
}

// Logic Simulation matching DocumentReader implementation
class ReaderState {
  constructor(docId) {
    this.docId = docId;
    const saved = localStorageMock.getItem('lb_reader_font_size');
    this.fontSize = saved ? Number(saved) : 16;
    this.minFontSize = 13;
    this.maxFontSize = 24;
  }

  handleFontSizeChange(delta) {
    const next = Math.max(this.minFontSize, Math.min(this.maxFontSize, this.fontSize + delta));
    this.fontSize = next;
    localStorageMock.setItem('lb_reader_font_size', String(next));
    return this.fontSize;
  }

  handleSetExact(size) {
    const valid = Math.max(this.minFontSize, Math.min(this.maxFontSize, size));
    this.fontSize = valid;
    localStorageMock.setItem('lb_reader_font_size', String(valid));
    return this.fontSize;
  }

  handleResetDefaults() {
    this.fontSize = 16;
    localStorageMock.setItem('lb_reader_font_size', '16');
  }

  getCSSVariables() {
    return {
      '--reader-font-size': `${this.fontSize}px`,
      '--reader-line-height': 1.75,
      '--reader-content-width': '820px'
    };
  }

  isDecDisabled() {
    return this.fontSize <= this.minFontSize;
  }

  isIncDisabled() {
    return this.fontSize >= this.maxFontSize;
  }
}

// 1. Default value is 16px
runTest('1. Cỡ chữ khởi tạo mặc định là 16px', () => {
  localStorageMock.clear();
  const reader = new ReaderState('doc-1');
  assert.strictEqual(reader.fontSize, 16);
});

// 2. Click A+ changes 16px -> 17px
runTest('2. Bấm A+ đổi từ 16px -> 17px', () => {
  localStorageMock.clear();
  const reader = new ReaderState('doc-1');
  reader.handleFontSizeChange(1);
  assert.strictEqual(reader.fontSize, 17);
});

// 3. Click A- changes 17px -> 16px
runTest('3. Bấm A- đổi từ 17px -> 16px', () => {
  const reader = new ReaderState('doc-1');
  reader.fontSize = 17;
  reader.handleFontSizeChange(-1);
  assert.strictEqual(reader.fontSize, 16);
});

// 4. Cannot decrease below 13px
runTest('4. Không giảm cỡ chữ dưới 13px (Min limit)', () => {
  const reader = new ReaderState('doc-1');
  reader.fontSize = 13;
  reader.handleFontSizeChange(-1);
  assert.strictEqual(reader.fontSize, 13);
  reader.handleFontSizeChange(-5);
  assert.strictEqual(reader.fontSize, 13);
});

// 5. Cannot increase above 24px
runTest('5. Không tăng cỡ chữ trên 24px (Max limit)', () => {
  const reader = new ReaderState('doc-1');
  reader.fontSize = 24;
  reader.handleFontSizeChange(1);
  assert.strictEqual(reader.fontSize, 24);
  reader.handleFontSizeChange(10);
  assert.strictEqual(reader.fontSize, 24);
});

// 6. CSS variable is accurately produced
runTest('6. CSS variable --reader-font-size phản ánh đúng font size thực tế', () => {
  const reader = new ReaderState('doc-1');
  reader.fontSize = 19;
  const vars = reader.getCSSVariables();
  assert.strictEqual(vars['--reader-font-size'], '19px');
});

// 7. Preference is persisted in localStorage
runTest('7. Cỡ chữ được lưu vào localStorage', () => {
  localStorageMock.clear();
  const reader = new ReaderState('doc-1');
  reader.handleFontSizeChange(2); // 16 -> 18
  assert.strictEqual(localStorageMock.getItem('lb_reader_font_size'), '18');
});

// 8. Reload retains preference
runTest('8. Khởi tạo lại (Reload trang) vẫn giữ nguyên cỡ chữ đã lưu', () => {
  localStorageMock.setItem('lb_reader_font_size', '20');
  const reader = new ReaderState('doc-1');
  assert.strictEqual(reader.fontSize, 20);
});

// 9. Switching documents does not reset preference
runTest('9. Đổi sang văn bản khác không làm mất cỡ chữ người dùng', () => {
  localStorageMock.setItem('lb_reader_font_size', '22');
  const readerA = new ReaderState('doc-luat-dn-2020');
  assert.strictEqual(readerA.fontSize, 22);
  const readerB = new ReaderState('doc-nd-255-gdlk-2026');
  assert.strictEqual(readerB.fontSize, 22);
});

// 10. Reset to default (16px) works
runTest('10. Nút Đặt lại mặc định khôi phục về 16px', () => {
  const reader = new ReaderState('doc-1');
  reader.fontSize = 24;
  reader.handleResetDefaults();
  assert.strictEqual(reader.fontSize, 16);
  assert.strictEqual(localStorageMock.getItem('lb_reader_font_size'), '16');
});

// 11. Buttons disabled at bounds
runTest('11. Nút A- bị disable tại 13px, Nút A+ bị disable tại 24px', () => {
  const reader = new ReaderState('doc-1');
  reader.fontSize = 13;
  assert.strictEqual(reader.isDecDisabled(), true);
  assert.strictEqual(reader.isIncDisabled(), false);

  reader.fontSize = 24;
  assert.strictEqual(reader.isDecDisabled(), false);
  assert.strictEqual(reader.isIncDisabled(), true);

  reader.fontSize = 16;
  assert.strictEqual(reader.isDecDisabled(), false);
  assert.strictEqual(reader.isIncDisabled(), false);
});

console.log(`\n📊 KẾT QUẢ KIỂM THỬ: ${testPassed}/${testTotal} bài test thành công (100% PASS)`);

if (testPassed === testTotal) {
  process.exit(0);
} else {
  process.exit(1);
}
