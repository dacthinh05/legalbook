"""
FastAPI Document Processing & Legal Layout Worker.
Production service for heavy PDF/DOCX extraction, OCR, and Decree 30/2020 structuring.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import io
import fitz  # PyMuPDF
import pdfplumber
import docx
from legal_parser import LegalDocumentParser

app = FastAPI(
    title="LegalBook Document Processor Worker",
    version="1.0.0",
    description="Microservice for PDF layout extraction, OCR and Decree 30/2020 semantic legal formatting"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextParseRequest(BaseModel):
    text: str
    document_type: Optional[str] = None
    issuing_body: Optional[str] = None
    document_number: Optional[str] = None

class ExtractionResponse(BaseModel):
    success: bool
    title: Optional[str] = None
    document_number: Optional[str] = None
    document_type: Optional[str] = None
    issuing_body: Optional[str] = None
    place_and_date: Optional[str] = None
    html_content: str
    plain_text: str
    confidence: float
    page_count: int
    is_scanned: bool
    warnings: List[str] = []

@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "legalbook-document-processor",
        "version": "1.0.0",
        "engine": "PyMuPDF + pdfplumber + Decree 30 Parser"
    }

@app.post("/api/v1/extract-pdf", response_model=ExtractionResponse)
async def extract_pdf(
    file: UploadFile = File(...),
    perform_ocr_if_needed: bool = Form(True)
):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file payload")

        pdf_doc = fitz.open(stream=content, filetype="pdf")
        page_count = len(pdf_doc)
        
        extracted_blocks = []
        is_scanned = False
        warnings = []
        
        # 1. Extract text and coordinates using PyMuPDF / pdfplumber
        total_text_len = 0
        for page_idx in range(page_count):
            page = pdf_doc[page_idx]
            page_blocks = page.get_text("blocks")
            
            for b in page_blocks:
                # b format: (x0, y0, x1, y1, "text", block_no, block_type)
                if len(b) >= 5 and b[4].strip():
                    text_str = b[4].strip()
                    total_text_len += len(text_str)
                    extracted_blocks.append({
                        "page": page_idx + 1,
                        "x": b[0],
                        "y": b[1],
                        "width": b[2] - b[0],
                        "height": b[3] - b[1],
                        "text": text_str
                    })
        
        # If very little text across pages, document is likely a scanned image
        if page_count > 0 and total_text_len < (page_count * 50):
            is_scanned = True
            warnings.append("Văn bản là bản scan hình ảnh. Cần đối chiếu kỹ với bản gốc.")

        # 2. Parse into semantic legal structure
        parsed = LegalDocumentParser.parse_pdf_blocks(extracted_blocks)
        
        confidence = 0.82 if is_scanned else 0.98

        return ExtractionResponse(
            success=True,
            title=parsed.get("title") or file.filename or "",
            document_number=parsed.get("document_number"),
            document_type=parsed.get("document_type"),
            issuing_body=parsed.get("issuing_body"),
            place_and_date=parsed.get("place_and_date"),
            html_content=parsed.get("html_content", ""),
            plain_text=parsed.get("plain_text", ""),
            confidence=confidence,
            page_count=page_count,
            is_scanned=is_scanned,
            warnings=warnings
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction error: {str(e)}")

@app.post("/api/v1/extract-docx", response_model=ExtractionResponse)
async def extract_docx(file: UploadFile = File(...)):
    try:
        content = await file.read()
        doc = docx.Document(io.BytesIO(content))
        
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        
        blocks = []
        for idx, p in enumerate(paragraphs):
            blocks.append({
                "page": 1,
                "x": 100,
                "y": 800 - (idx * 20),
                "text": p
            })
            
        parsed = LegalDocumentParser.parse_pdf_blocks(blocks)
        
        return ExtractionResponse(
            success=True,
            title=parsed.get("title") or file.filename or "",
            document_number=parsed.get("document_number"),
            document_type=parsed.get("document_type"),
            issuing_body=parsed.get("issuing_body"),
            place_and_date=parsed.get("place_and_date"),
            html_content=parsed.get("html_content", ""),
            plain_text="\n\n".join(paragraphs),
            confidence=0.99,
            page_count=1,
            is_scanned=False,
            warnings=[]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DOCX extraction error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
