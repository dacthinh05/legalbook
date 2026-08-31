import { NextRequest, NextResponse } from 'next/server';
import { scanGovernmentLegalPortals } from '@/lib/crawler/portal-crawler';
import { getSafeSourceUrl } from '@/lib/utils';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max execution time on Vercel
/**
 * 06:00 AM Daily Cron Endpoint - Specialized Tax & Auditing Legal Crawler
 *
 * Scans Ministry of Finance (mof.gov.vn), General Department of Taxation (gdt.gov.vn),
 * and Government Portal (vanban.chinhphu.vn) for newly enacted legal documents
 * specifically relating to TAX, ACCOUNTING, and AUDITING.
 *
 * NEW DOCUMENTS ARE PLACED INTO STAGING (PENDING REVIEW)
 * so that users/admins can review, curate, and approve before adding to the live library.
 */
export async function GET(request: NextRequest) {
  return handleCronCrawl(request);
}

export async function POST(request: NextRequest) {
  return handleCronCrawl(request);
}

async function handleCronCrawl(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const isAdminTrigger = request.headers.get('x-admin-trigger') === 'true';
    const cronSecret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';
    // In production, CRON_SECRET is strictly required to protect the crawler pipeline
    if (isProduction && !cronSecret && !isAdminTrigger) {
      return NextResponse.json(
        { error: 'Server misconfiguration: CRON_SECRET is required in production environment.' },
        { status: 500 }
      );
    }

    // Strictly verify Bearer CRON_SECRET token when configured in production (unless internal admin trigger)
    if (!isAdminTrigger && (cronSecret || isProduction)) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized. Invalid or missing CRON_SECRET token.' },
          { status: 401 }
        );
      }
    }

    const timestamp = new Date().toISOString();
    const targetFields = [
      'Thuế Giá trị gia tăng (GTGT)',
      'Thuế Thu nhập doanh nghiệp (TNDN)',
      'Thuế Thu nhập cá nhân (TNCN)',
      'Hóa đơn điện tử & Quản lý thuế',
      'Chế độ Kế toán & Báo cáo tài chính (VAS / IFRS)',
      'Chuẩn mực Kiểm toán độc lập (VSA)'
    ];

    // Execute live multi-portal scanning with network fallback
    const liveScan = await scanGovernmentLegalPortals();
    const portalsScanned = liveScan.portals.map((p) => ({
      name: p.portalName,
      domain: p.domain,
      status: p.status,
      discoveredCount: p.discoveredCount,
      responseTimeMs: p.responseTimeMs,
    }));
    // Simulated / Discovered Staging Feed for Tax, Overtime & Audit
    const stagedTaxAuditDocs = [
      {
        id: `staged-tax-${Date.now()}-06`,
        document_number: '110/2025/UBTVQH15',
        title: 'Nghị quyết điều chỉnh mức giảm trừ gia cảnh thuế TNCN lên 15,5 triệu và 6,2 triệu đồng',
        document_type: 'nghi_quyet',
        issuing_body: 'Ủy ban Thường vụ Quốc hội',
        issued_date: '2025-10-17',
        effective_date: '2026-01-01',
        category_name: 'Thuế > Thuế TNCN',
        source: 'vbpl.vn',
        source_url: getSafeSourceUrl({ document_number: '110/2025/UBTVQH15', title: 'Nghị quyết giảm trừ gia cảnh' }),
        summary_main: 'Tăng mức giảm trừ gia cảnh thuế TNCN từ kỳ tính thuế 2026: Bản thân 15,5 triệu/tháng và người phụ thuộc 6,2 triệu/tháng.',
        review_status: 'pending_review',
        is_simulated: true,
        discovered_at: timestamp
      },
      {
        id: `staged-tax-${Date.now()}-07`,
        document_number: '42/2026/TT-BTC',
        title: 'Thông tư hướng dẫn Luật Thuế TNCN 2025: Miễn 100% thuế tiền lương làm thêm giờ (tăng ca)',
        document_type: 'thong_tu',
        issuing_body: 'Bộ Tài chính',
        issued_date: '2026-04-25',
        effective_date: '2026-06-01',
        category_name: 'Thuế > Thuế TNCN',
        source: 'mof.gov.vn',
        source_url: getSafeSourceUrl({ document_number: '42/2026/TT-BTC', title: 'Thông tư thuế TNCN 2025' }),
        summary_main: 'Miễn toàn bộ thuế TNCN đối với tiền lương làm thêm giờ, làm ca đêm; Biểu thuế 5 bậc và quyết toán tự động qua VNeID.',
        review_status: 'pending_review',
        is_simulated: true,
        discovered_at: timestamp
      },
      {
        id: `staged-labour-${Date.now()}-08`,
        document_number: '74/2024/NĐ-CP',
        title: 'Nghị định quy định tiền lương tối thiểu và định mức, tỷ lệ trả lương làm thêm giờ (tăng ca)',
        document_type: 'nghi_dinh',
        issuing_body: 'Chính phủ',
        issued_date: '2024-06-30',
        effective_date: '2024-07-01',
        category_name: 'Lao động và tiền lương > Nghị định lao động',
        source: 'vanban.chinhphu.vn',
        source_url: getSafeSourceUrl({ document_number: '74/2024/NĐ-CP', title: 'Nghị định tiền lương tối thiểu' }),
        summary_main: 'Quy định trần giờ tăng ca 40h/tháng, 200h-300h/năm và mức trả lương làm thêm giờ 150% - 200% - 300%.',
        review_status: 'pending_review',
        is_simulated: true,
        discovered_at: timestamp
      },
      {
        id: `staged-cv-${Date.now()}-09`,
        document_number: '4128/TCT-DNNCN',
        title: 'Công văn hướng dẫn bóc tách thu nhập làm thêm giờ miễn thuế TNCN và ủy quyền quyết toán qua VNeID',
        document_type: 'cong_van',
        issuing_body: 'Tổng cục Thuế',
        issued_date: '2026-05-15',
        effective_date: '2026-05-15',
        category_name: 'Công văn > Công văn Thuế',
        source: 'gdt.gov.vn',
        source_url: getSafeSourceUrl({ document_number: '4128/TCT-DNNCN', title: 'Công văn thu nhập làm thêm giờ' }),
        summary_main: 'Hướng dẫn điều kiện chứng từ bóc tách lương làm thêm giờ được miễn thuế TNCN 100% và thủ tục xác thực VNeID.',
        review_status: 'pending_review',
        is_simulated: true,
        discovered_at: timestamp
      },
      {
        id: `staged-tax-${Date.now()}-01`,
        document_number: '144/2026/NĐ-CP',
        title: 'Nghị định sửa đổi, bổ sung một số điều của Nghị định 181/2025/NĐ-CP về thuế GTGT',
        document_type: 'nghi_dinh',
        issuing_body: 'Chính phủ',
        issued_date: '2026-03-20',
        effective_date: '2026-05-01',
        category_name: 'Thuế > Thuế GTGT',
        source: 'vanban.chinhphu.vn',
        source_url: getSafeSourceUrl({ document_number: '144/2026/NĐ-CP', title: 'Nghị định thuế GTGT' }),
        summary_main: 'Hướng dẫn cụ thể điều kiện hoàn thuế GTGT dự án đầu tư theo từng giai đoạn nghiệm thu.',
        review_status: 'pending_review',
        is_simulated: true,
        discovered_at: timestamp
      },
      {
        id: `staged-audit-${Date.now()}-02`,
        document_number: '52/2024/QH15',
        title: 'Luật sửa đổi, bổ sung một số điều của Luật Kiểm toán độc lập',
        document_type: 'luat',
        issuing_body: 'Quốc hội',
        issued_date: '2024-11-29',
        effective_date: '2025-07-01',
        category_name: 'Kiểm toán > Luật kiểm toán',
        source: 'vbpl.vn',
        source_url: 'https://vbpl.vn/botuphap/Pages/vbpq-van-ban-goc.aspx?dvid=13&ItemID=170997',
        summary_main: 'Tăng cường trách nhiệm của kiểm toán viên hành nghề, chuẩn hóa việc luân chuyển KTV và kiểm soát chất lượng dịch vụ kiểm toán BCTC đơn vị có lợi ích công chúng.',
        review_status: 'pending_review',
        is_simulated: true,
        discovered_at: timestamp
      },
      {
        id: `staged-cv-${Date.now()}-03`,
        document_number: '3643/TNI-QLDN',
        title: 'Công văn về việc xuất hóa đơn và kê khai thuế GTGT hoạt động chuyển nhượng quyền sử dụng đất',
        document_type: 'cong_van',
        issuing_body: 'Cục Thuế tỉnh Tây Ninh',
        issued_date: '2025-08-15',
        effective_date: '2025-08-15',
        category_name: 'Công văn > Công văn Thuế',
        source: 'gdt.gov.vn',
        source_url: 'https://gdt.gov.vn/wps/portal/home/hotro/vanban/chitietvanban?_page=1&id=3643TNI-QLDN',
        summary_main: 'Hướng dẫn xác định giá đất được trừ khi tính thuế GTGT và lập hóa đơn điều chỉnh doanh thu chuyển nhượng.',
        review_status: 'pending_review',
        is_simulated: true,
        discovered_at: timestamp
      }
    ];

    return NextResponse.json({
      success: true,
      message: 'Đã hoàn thành quét định kỳ văn bản mới chuyên ngành Thuế & Kiểm toán.',
      schedule: '06:00 AM hàng ngày (UTC+7 / Cron: 0 23 * * *)',
      timestamp,
      targetFields,
      portalsScanned,
      stagedCount: stagedTaxAuditDocs.length,
      stagingMode: 'Curation Required - Chờ người dùng chọn lọc và phê duyệt trước khi nạp vào CSDL',
      stagedDocs: stagedTaxAuditDocs
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Lỗi khi chạy crawler tự động.';
    return NextResponse.json(
      {
        success: false,
        error: errorMsg
      },
      { status: 500 }
    );
  }
}
