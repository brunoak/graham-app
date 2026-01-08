"""
Graham PDF Parser - FastAPI Microservice

Parses brokerage notes from Brazilian and international brokers.
Includes rate limiting and file size validation for security.
"""

import os
from fastapi import FastAPI, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models.schemas import ParseResponse, HealthResponse
from parsers import br_nota, ibkr, generic, inter_global, avenue

load_dotenv()

# =============================================================================
# Security Configuration
# =============================================================================

# Max file size: 10MB (brokerage notes are typically 100KB-2MB)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes

# Rate limiting: 20 requests per minute per IP
RATE_LIMIT = os.getenv("RATE_LIMIT", "20/minute")

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# =============================================================================
# App Setup
# =============================================================================

app = FastAPI(
    title="Graham PDF Parser",
    description="API for parsing brokerage notes from multiple brokers",
    version="1.1.0",
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "false").lower() == "true" else None,
    redoc_url="/redoc" if os.getenv("ENABLE_DOCS", "false").lower() == "true" else None,
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS - more restrictive
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Only necessary methods
    allow_headers=["Content-Type", "Authorization"],  # Only necessary headers
)


# =============================================================================
# Helper Functions
# =============================================================================

async def validate_file(file: UploadFile, allowed_extensions: list[str] = [".pdf"]) -> bytes:
    """
    Validate uploaded file for size and extension.
    Returns file contents if valid, raises HTTPException otherwise.
    """
    # Check extension
    filename_lower = file.filename.lower() if file.filename else ""
    if not any(filename_lower.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400, 
            detail=f"File must be one of: {', '.join(allowed_extensions)}"
        )
    
    # Read and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    return contents


# =============================================================================
# Endpoints
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Railway/monitoring"""
    return HealthResponse(
        status="ok",
        version="1.1.0",
        parsers=["br-nota", "ibkr", "inter-global", "avenue", "generic"]
    )


@app.post("/parse/br-nota", response_model=ParseResponse)
@limiter.limit(RATE_LIMIT)
async def parse_br_nota(request: Request, file: UploadFile, password: str = None, debug: bool = False):
    """
    Parse Brazilian brokerage note PDF.
    
    Supports: Clear, XP, Rico, BTG, Nuinvest, Inter
    
    Note: Rico, XP, BTG and Clear PDFs are password-protected (usually your CPF without dots/dashes).
    Set debug=true to see raw extracted text for troubleshooting.
    
    Rate limit: 20 requests/minute per IP
    Max file size: 10MB
    """
    try:
        contents = await validate_file(file, [".pdf"])
        result = br_nota.parse(contents, password=password, debug=debug)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


@app.post("/parse/ibkr", response_model=ParseResponse)
@limiter.limit(RATE_LIMIT)
async def parse_ibkr_statement(request: Request, file: UploadFile):
    """
    Parse Interactive Brokers Activity Statement.
    
    Supports: PDF Activity Statement, CSV trades export
    
    Rate limit: 20 requests/minute per IP
    Max file size: 10MB
    """
    try:
        contents = await validate_file(file, [".pdf", ".csv"])
        is_csv = file.filename.lower().endswith('.csv') if file.filename else False
        result = ibkr.parse(contents, is_csv=is_csv)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


@app.post("/parse/inter-global", response_model=ParseResponse)
@limiter.limit(RATE_LIMIT)
async def parse_inter_global(request: Request, file: UploadFile, password: str = None, debug: bool = False):
    """
    Parse Inter Global (Inter Co Securities LLC) transaction confirmation PDF.
    
    For US securities transactions from Inter's international account.
    
    Rate limit: 20 requests/minute per IP
    Max file size: 10MB
    """
    try:
        contents = await validate_file(file, [".pdf"])
        result = inter_global.parse(contents, password=password, debug=debug)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


@app.post("/parse/avenue", response_model=ParseResponse)
@limiter.limit(RATE_LIMIT)
async def parse_avenue(request: Request, file: UploadFile, password: str = None, debug: bool = False):
    """
    Parse Avenue Securities transaction confirmation PDF.
    
    For US securities transactions from Avenue.
    
    Rate limit: 20 requests/minute per IP
    Max file size: 10MB
    """
    try:
        contents = await validate_file(file, [".pdf"])
        result = avenue.parse(contents, password=password, debug=debug)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


@app.post("/parse/generic", response_model=ParseResponse)
@limiter.limit(RATE_LIMIT)
async def parse_generic_pdf(request: Request, file: UploadFile):
    """
    Generic PDF parser using pdfplumber.
    
    Fallback for unsupported brokers.
    
    Rate limit: 20 requests/minute per IP
    Max file size: 10MB
    """
    try:
        contents = await validate_file(file, [".pdf"])
        result = generic.parse(contents)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
