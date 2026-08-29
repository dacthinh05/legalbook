import { IMPORT_CONFIG } from './types';

export interface ValidationResult {
  isValid: boolean;
  fileExtension: 'doc' | 'docx' | 'pdf' | null;
  mimeType: string;
  hash: string;
  error?: string;
}

export function sanitizeFileName(name: string): string {
  if (!name) return 'document';
  // Remove path traversal, null bytes, windows forbidden chars
  return name
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[\\/:\*\?"<>\|]/g, '_')
    .replace(/\.\.+/g, '.')
    .trim();
}

/**
 * Calculates a SHA-256 hash representation from a Uint8Array or ArrayBuffer.
 */
export async function calculateFileHash(buffer: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as unknown as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple checksum if Web Crypto not available
  let hash = 0;
  for (let i = 0; i < buffer.length; i++) {
    hash = (hash << 5) - hash + buffer[i];
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}_${buffer.length}`;
}

/**
 * Checks magic bytes against expected signatures.
 */
export function checkMagicBytes(buffer: Uint8Array): 'pdf' | 'docx' | 'doc' | null {
  if (buffer.length < 8) return null;

  // PDF: %PDF-
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'pdf';
  }

  // DOCX / ZIP: PK\x03\x04
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return 'docx';
  }

  // DOC (Binary CFBF OLE): 0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return 'doc';
  }

  return null;
}

/**
 * Validates a file before processing.
 */
export async function validateFile(
  file: { name: string; size: number; type?: string },
  buffer: Uint8Array,
  maxSize: number = IMPORT_CONFIG.MAX_FILE_SIZE
): Promise<ValidationResult> {
  const sanitizedName = sanitizeFileName(file.name);
  const hash = await calculateFileHash(buffer);

  // 1. Check size
  if (file.size > maxSize || buffer.length > maxSize) {
    return {
      isValid: false,
      fileExtension: null,
      mimeType: file.type || 'application/octet-stream',
      hash,
      error: `Dung lượng tệp (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn cho phép (${(maxSize / (1024 * 1024)).toFixed(0)}MB).`,
    };
  }

  if (buffer.length === 0) {
    return {
      isValid: false,
      fileExtension: null,
      mimeType: file.type || 'application/octet-stream',
      hash,
      error: 'Tệp rỗng hoặc không có dữ liệu.',
    };
  }

  // 2. Check Magic Bytes
  const magicFormat = checkMagicBytes(buffer);
  const extMatch = sanitizedName.match(/\.(docx|doc|pdf)$/i);
  const fileExt = extMatch ? (extMatch[1].toLowerCase() as 'doc' | 'docx' | 'pdf') : null;

  if (!fileExt && !magicFormat) {
    return {
      isValid: false,
      fileExtension: null,
      mimeType: file.type || 'application/octet-stream',
      hash,
      error: 'Định dạng tệp không được hỗ trợ. Chỉ hỗ trợ .doc, .docx và .pdf.',
    };
  }

  // If file has an extension but magic bytes do not match any supported document format
  if (!magicFormat) {
    return {
      isValid: false,
      fileExtension: null,
      mimeType: file.type || 'application/octet-stream',
      hash,
      error: `Tệp không có chữ ký số (magic bytes) hợp lệ cho định dạng .${fileExt}. Có thể là tệp bị đổi đuôi hoặc bị hỏng.`,
    };
  }

  // Check mismatch between extension and magic bytes (e.g. .pdf renamed to .docx or vice versa)
  if (fileExt && magicFormat !== fileExt) {
    if (!(magicFormat === 'docx' && fileExt === 'doc') && !(magicFormat === 'doc' && fileExt === 'docx')) {
      return {
        isValid: false,
        fileExtension: magicFormat,
        mimeType: file.type || 'application/octet-stream',
        hash,
        error: `Phần mở rộng tệp (.${fileExt}) không khớp với định dạng thực tế (${magicFormat.toUpperCase()}).`,
      };
    }
  }

  const determinedExt = magicFormat;

  const mimeMap = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
  };

  return {
    isValid: true,
    fileExtension: determinedExt,
    mimeType: mimeMap[determinedExt],
    hash,
  };
}
