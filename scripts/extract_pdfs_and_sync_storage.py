import os
import re
import json
import glob
import pypdf
from urllib.parse import quote

# 1. Read files and extract text using pypdf
doc_dir = os.path.join(os.path.dirname(__file__), '../public/documents')
pdf_files = glob.glob(os.path.join(doc_dir, '*.pdf'))

extracted_texts = {}

for pf in pdf_files:
    fname = os.path.basename(pf)
    reader = pypdf.PdfReader(pf)
    text = ""
    for page in reader.pages:
        text += (page.extract_text() or "") + "\n\n"
    extracted_texts[fname] = text
    print(f"Extracted PDF [{fname}]: {len(text)} chars")

# Map of document IDs to PDF file patterns
pdf_map = {
    'doc-cv-1585-qtr-2025': '1585',
    'doc-cv-572-tng-2025': '572',
    'doc-nd-50-datdai-2026': '50.2026'
}

# Load demo-data.ts
demo_data_path = os.path.join(os.path.dirname(__file__), '../src/lib/demo-data.ts')
with open(demo_data_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract json DEMO_DOCUMENTS
match = re.search(r'export const DEMO_DOCUMENTS: Partial<LegalDocument>\[\] = (\[[\s\S]*?\]);\n\nexport const DEMO_CATEGORY_LINKS', content)
if match:
    docs_json = json.loads(match.group(1))
    
    for doc in docs_json:
        doc_id = doc.get('id')
        prefix = pdf_map.get(doc_id)
        if prefix:
            # Find matching pdf
            matched_file = None
            for fname, ptext in extracted_texts.items():
                if prefix.lower() in fname.lower():
                    matched_file = fname
                    break
            
            if matched_file and len(extracted_texts[matched_file]) > 50:
                raw_text = extracted_texts[matched_file]
                paragraphs = raw_text.split('\n\n')
                html_paragraphs = "".join([f"<p>{p.strip().replace(chr(10), '<br/>')}</p>\n" for p in paragraphs if p.strip()])
                
                doc['html_content'] = f"""
<div class="document-full-body">
{html_paragraphs}
</div>
"""
                print(f"Updated doc [{doc.get('document_number')}] with authentic full text from PDF ({len(raw_text)} chars)")
        
        # Attach Supabase CDN file link
        if doc.get('files'):
            for f in doc['files']:
                fname = f.get('original_filename')
                if fname:
                    storage_path = quote(fname).replace('%', '_')
                    f['file_url'] = f"https://pfgxkybzwwuzkyquhpdc.supabase.co/storage/v1/object/public/documents/{storage_path}"

    # Write back
    new_docs_str = json.dumps(docs_json, ensure_ascii=False, indent=2)
    new_content = content[:match.start(1)] + new_docs_str + content[match.end(1):]
    with open(demo_data_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully synchronized full text & Supabase Storage CDN URLs in demo-data.ts!")
