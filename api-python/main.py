"""
Graham PDF Parser - FastAPI Microservice

Parses brokerage notes from Brazilian and international brokers.
"""

import os
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models.schemas import ParseResponse, HealthResponse
from parsers import br_nota, ibkr, generic, inter_global, avenue

load_dotenv()

app = FastAPI(
    title="Graham PDF Parser",
    description="API for parsing brokerage notes from multiple brokers",
    version="1.0.0"
)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Railway/monitoring"""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        parsers=["br-nota", "ibkr", "inter-global", "avenue", "generic"]
    )


@app.post("/parse/br-nota", response_model=ParseResponse)
async def parse_br_nota(file: UploadFile, password: str = None, debug: bool = False):
    """
    Parse Brazilian brokerage note PDF.
    
    Supports: Clear, XP, Rico, BTG, Nuinvest, Inter
    
    Note: Rico, XP, BTG and Clear PDFs are password-protected (usually your CPF without dots/dashes).
    Set debug=true to see raw extracted text for troubleshooting.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        contents = await file.read()
        result = br_nota.parse(contents, password=password, debug=debug)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


@app.post("/parse/ibkr", response_model=ParseResponse)
async def parse_ibkr_statement(file: UploadFile):
    """
    Parse Interactive Brokers Activity Statement.
    
    Supports: PDF Activity Statement, CSV trades export
    """
    filename = file.filename.lower()
    if not (filename.endswith('.pdf') or filename.endswith('.csv')):
        raise HTTPException(status_code=400, detail="File must be PDF or CSV")
    
    try:
        contents = await file.read()
        result = ibkr.parse(contents, is_csv=filename.endswith('.csv'))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


@app.post("/parse/inter-global", response_model=ParseResponse)
async def parse_inter_global(file: UploadFile, password: str = None, debug: bool = False):
    """
    Parse Inter Global (Inter Co Securities LLC) transaction confirmation PDF.
    
    For US securities transactions from Inter's international account.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        contents = await file.read()
        result = inter_global.parse(contents, password=password, debug=debug)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


@app.post("/parse/avenue", response_model=ParseResponse)
async def parse_avenue(file: UploadFile, password: str = None, debug: bool = False):
    """
    Parse Avenue Securities transaction confirmation PDF.
    
    For US securities transactions from Avenue.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        contents = await file.read()
        result = avenue.parse(contents, password=password, debug=debug)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


@app.post("/parse/generic", response_model=ParseResponse)
async def parse_generic_pdf(file: UploadFile):
    """
    Generic PDF parser using pdfplumber.
    
    Fallback for unsupported brokers.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        contents = await file.read()
        result = generic.parse(contents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
