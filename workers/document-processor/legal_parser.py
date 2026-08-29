"""
Legal Layout Parser & Decree 30/2020/NĐ-CP Semantic Extractor.
Translates raw document streams and PDF text runs with coordinates
into normalized legal hierarchy models and semantic HTML.
"""

from typing import List, Dict, Any, Optional
import re

class LegalDocumentParser:
    @staticmethod
    def parse_pdf_blocks(blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Parses extracted PDF layout blocks into structured legal components.
        """
        left_header_lines: List[str] = []
        right_header_lines: List[str] = []
        body_blocks: List[str] = []
        
        doc_number = ""
        issuing_body = ""
        place_and_date = ""
        title = ""
        doc_type = ""
        
        # Sort blocks top-to-bottom
        sorted_blocks = sorted(blocks, key=lambda b: (b.get("page", 1), -b.get("y", 0)))
        
        for b in sorted_blocks:
            text = (b.get("text") or "").strip()
            if not text:
                continue
                
            x = b.get("x", 0)
            page = b.get("page", 1)
            
            # Header zone on first page
            if page == 1 and b.get("y", 0) > 600:
                if x < 240:
                    left_header_lines.append(text)
                    if not issuing_body and re.search(r"(BỘ|CHÍNH PHỦ|ỦY BAN|TỔNG CỤC|CỤC|SỞ|QUỐC HỘI)", text, re.I):
                        issuing_body = text
                    num_match = re.search(r"Số:\s*([A-Za-z0-9\/\-\.À-Ỹà-ỹ_]+)", text, re.I)
                    if num_match:
                        doc_number = num_match.group(1)
                else:
                    right_header_lines.append(text)
                    date_match = re.search(r"((?:Hà\s+Nội|TP\.\s*Hồ\s+Chí\s+Minh|[A-ZÀ-Ỹa-zà-ỹ\s]+),\s*ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4})", text, re.I)
                    if date_match:
                        place_and_date = date_match.group(1)
            else:
                body_blocks.append(text)
                
                # Check for document type / title if not set
                if not doc_type:
                    type_match = re.match(r"^(THÔNG TƯ|NGHỊ ĐỊNH|QUYẾT ĐỊNH|LUẬT|BỘ LUẬT|CÔNG VĂN|NGHỊ QUYẾT|CHỈ THỊ)\b", text, re.I)
                    if type_match:
                        doc_type = type_match.group(1).upper()
                        title = text
        
        # Build semantic HTML output
        html_parts = ['<div class="document-full-body">']
        
        # 1. Masthead
        if left_header_lines or right_header_lines:
            agency_name = issuing_body or (left_header_lines[0] if left_header_lines else "CƠ QUAN BAN HÀNH")
            html_parts.append(f'''
<div class="document-letterhead" role="region" aria-label="Đầu văn bản hành chính">
  <section class="letterhead-left">
    <p class="letterhead-agency">{agency_name.upper()}</p>
    <div class="letterhead-rule letterhead-rule-agency" aria-hidden="true"></div>
    {f'<p class="letterhead-number">Số: {doc_number}</p>' if doc_number else ''}
  </section>
  <section class="letterhead-right">
    <p class="letterhead-motto-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
    <p class="letterhead-motto-slogan">Độc lập - Tự do - Hạnh phúc</p>
    <div class="letterhead-rule letterhead-rule-motto" aria-hidden="true"></div>
    {f'<p class="letterhead-date">{place_and_date}</p>' if place_and_date else ''}
  </section>
</div>''')

        # 2. Body Blocks
        for blk in body_blocks:
            # Article
            if re.match(r"^Điều\s+\d+", blk, re.I):
                num_m = re.match(r"^Điều\s+(\d+[a-z]?)", blk, re.I)
                art_id = f' id="dieu-{num_m.group(1).lower()}"' if num_m else ''
                html_parts.append(f'<h2 class="legal-article-title"{art_id}>{blk}</h2>')
            # Chapter
            elif re.match(r"^Chương\s+[IVXLCDM\d]+", blk, re.I):
                parts = re.split(r"[\n\r]+|\s*[-–—:]\s*", blk, maxsplit=1)
                num_str = parts[0].strip()
                title_str = parts[1].strip() if len(parts) > 1 else ""
                html_parts.append(f'''
<div class="legal-chapter-block">
  <p class="legal-chapter-num">{num_str}</p>
  {f'<h2 class="legal-chapter-title">{title_str}</h2>' if title_str else ''}
</div>''')
            # Legal Basis
            elif re.match(r"^(Căn cứ|Theo đề nghị|Bộ trưởng)", blk, re.I):
                html_parts.append(f'<p class="legal-basis"><em>{blk}</em></p>')
            # Clause (1. ...)
            elif re.match(r"^\d+\.\s+", blk):
                m = re.match(r"^(\d+)\.\s+(.*)", blk, re.DOTALL)
                if m:
                    html_parts.append(f'<div class="legal-clause"><span class="clause-num">{m.group(1)}.</span><div class="clause-text">{m.group(2)}</div></div>')
                else:
                    html_parts.append(f'<p>{blk}</p>')
            # Point (a) ...)
            elif re.match(r"^[a-zđ]\)\s+", blk, re.I):
                m = re.match(r"^([a-zđ])\)\s+(.*)", blk, re.DOTALL | re.I)
                if m:
                    html_parts.append(f'<div class="legal-point"><span class="point-num">{m.group(1)})</span><div class="point-text">{m.group(2)}</div></div>')
                else:
                    html_parts.append(f'<p>{blk}</p>')
            else:
                html_parts.append(f'<p>{blk}</p>')

        html_parts.append('</div>')
        full_html = "\n".join(html_parts)
        
        return {
            "issuing_body": issuing_body,
            "document_number": doc_number,
            "document_type": doc_type,
            "title": title,
            "place_and_date": place_and_date,
            "html_content": full_html,
            "plain_text": "\n\n".join(left_header_lines + right_header_lines + body_blocks)
        }
