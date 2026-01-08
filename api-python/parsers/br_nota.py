"""
Brazilian Brokerage Note Parser

Parses PDF notes from Brazilian brokers:
- Clear Corretora
- XP Investimentos  
- Rico
- BTG Pactual
- Nuinvest
- Inter
"""

import re
import io
from datetime import datetime
from typing import Dict, List, Any, Optional
import pdfplumber

from models.schemas import ParseResponse, Operation, Fees, OperationType, AssetType


# Broker identification patterns
BROKER_PATTERNS = {
    "Clear": ["clear corretora", "clear s.a", "clear ctvm", "clear -"],
    "XP": ["xp investimentos", "xp cctvm", "xp s.a.", "xp s/a"],
    "Rico": ["rico investimentos", "rico ctvm", "rico s.a", "rico -", "rico s/a", "riconnect", "rico corretora"],
    "BTG Pactual": ["btg pactual", "btg ctvm"],
    "Nuinvest": ["nuinvest", "easynvest"],
    "Inter": ["inter dtvm", "banco inter", "inter invest", "inter s.a", "intermedium"],
    "Genial": ["genial investimentos"],
    "Modal": ["modal dtvm"],
    "Ágora": ["agora ctvm", "ágora"],
}

# Ticker patterns for Brazilian assets
# Format: Symbol (4-6 chars) + Number (1-2 digits) + Optional F (fracionário)
BR_TICKER_PATTERN = re.compile(r'\b([A-Z]{4,6})(\d{1,2})F?\b')

# FII identification (ticker ending in 11)
FII_PATTERN = re.compile(r'^[A-Z]{4}11$')

# ETF list (common Brazilian ETFs)
BR_ETFS = {"BOVA11", "IVVB11", "SMAL11", "HASH11", "DIVO11", "BOVB11", "ECOO11"}

# Common Brazilian stock names to ticker mapping (Rico uses names instead of tickers)
STOCK_NAME_TO_TICKER = {
    # Energy
    "cemig": "CMIG4",
    "taesa": "TAEE11",
    "eletrobras": "ELET3",
    "copel": "CPLE6",
    "engie": "EGIE3",
    "energisa": "ENGI11",
    "equatorial": "EQTL3",
    "cpfl": "CPFE3",
    # Banks
    "itau": "ITUB4",
    "itausa": "ITSA4",
    "bradesco": "BBDC4",
    "banco do brasil": "BBAS3",
    "santander": "SANB11",
    "btg": "BPAC11",
    # Commodities  
    "petrobras": "PETR4",
    "vale": "VALE3",
    "gerdau": "GGBR4",
    "csn": "CSNA3",
    "usiminas": "USIM5",
    "suzano": "SUZB3",
    "klabin": "KLBN11",
    # Consumer
    "ambev": "ABEV3",
    "magazine luiza": "MGLU3",
    "lojas renner": "LREN3",
    "natura": "NTCO3",
    "weg": "WEGE3",
    "localiza": "RENT3",
    # Others
    "b3": "B3SA3",
    "bb seguridade": "BBSE3",
    "jbs": "JBSS3",
    "brf": "BRFS3",
    "totvs": "TOTS3",
    "raia drogasil": "RADL3",
    "hapvida": "HAPV3",
}


def identify_broker(text: str) -> Optional[str]:
    """Identify the broker from the PDF text"""
    text_lower = text.lower()
    for broker, patterns in BROKER_PATTERNS.items():
        for pattern in patterns:
            if pattern in text_lower:
                return broker
    return None


def identify_asset_type(ticker: str) -> AssetType:
    """Identify asset type from ticker"""
    if ticker in BR_ETFS:
        return AssetType.ETF_BR
    if FII_PATTERN.match(ticker):
        return AssetType.REIT_BR
    return AssetType.STOCK_BR


def extract_date(text: str) -> Optional[datetime]:
    """Extract note date from text"""
    # Common date patterns in Brazilian notes
    patterns = [
        r'data pregão[:\s]*(\d{2}/\d{2}/\d{4})',
        r'data do pregão[:\s]*(\d{2}/\d{2}/\d{4})',
        r'(\d{2}/\d{2}/\d{4})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            try:
                return datetime.strptime(match.group(1), "%d/%m/%Y")
            except ValueError:
                continue
    return None


def extract_note_number(text: str) -> Optional[str]:
    """Extract brokerage note number"""
    patterns = [
        r'nr\.\s*nota[:\s]*(\d+)',
        r'nota[:\s]*(\d+)',
        r'número[:\s]*(\d+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return match.group(1)
    return None


def parse_operations_from_table(tables: List) -> List[Dict]:
    """Extract operations from PDF tables"""
    operations = []
    
    for table in tables:
        if not table:
            continue
            
        for row in table:
            # Skip header rows and empty rows
            if not row or not any(row):
                continue
            
            # Try to find ticker in the row
            row_text = " ".join(str(cell) for cell in row if cell)
            ticker_match = BR_TICKER_PATTERN.search(row_text)
            
            if ticker_match:
                ticker = ticker_match.group(0)
                
                # Try to extract quantity and price
                numbers = re.findall(r'[\d.,]+', row_text)
                numbers = [n.replace('.', '').replace(',', '.') for n in numbers if n]
                
                # Heuristic: look for C (compra) or V (venda)
                op_type = OperationType.BUY
                if ' v ' in row_text.lower() or 'venda' in row_text.lower():
                    op_type = OperationType.SELL
                
                # Try to parse quantity and price from numbers
                if len(numbers) >= 2:
                    try:
                        # Parse all numbers as floats
                        float_numbers = [float(n) for n in numbers if float(n) > 0]
                        
                        if len(float_numbers) >= 2:
                            # Heuristic: usually the largest number is the total
                            # The smallest is often the quantity (unless it's a large quantity trade)
                            sorted_nums = sorted(float_numbers)
                            
                            # Find quantity: usually an integer or small number
                            quantity = None
                            for n in float_numbers:
                                # Quantity is usually a whole number or near-whole
                                if n == int(n) or (n < 1000 and n == round(n, 0)):
                                    quantity = n
                                    break
                            
                            if not quantity:
                                quantity = sorted_nums[0]  # Smallest number
                            
                            # Total is usually the largest number
                            total = sorted_nums[-1]
                            
                            # Calculate price from total / quantity
                            if quantity > 0:
                                price = total / quantity
                            else:
                                price = 0
                            
                            # Validate: price should be reasonable (between 0.01 and 100000)
                            if 0.01 <= price <= 100000:
                                operations.append({
                                    "ticker": ticker,
                                    "type": op_type,
                                    "quantity": quantity,
                                    "price": round(price, 2),
                                    "total": total
                                })
                    except (ValueError, IndexError):
                        continue
    
    return operations


def name_to_ticker(name: str) -> Optional[str]:
    """Convert a stock name to its ticker symbol"""
    name_lower = name.lower()
    
    for stock_name, ticker in STOCK_NAME_TO_TICKER.items():
        if stock_name in name_lower:
            return ticker
    
    return None


def parse_rico_format(tables: List, text: str) -> List[Dict]:
    """
    Parse Rico-specific format where operations have company names instead of tickers.
    Format: 1-BOVESPA C FRACIONARIO CEMIG PN N1 @# 10 11,30 113,00 D
    """
    operations = []
    
    # Try parsing from text first since Rico's format is line-based
    lines = text.split('\n')
    
    for line in lines:
        line_lower = line.lower()
        
        # Skip non-operation lines
        if 'bovespa' not in line_lower and 'fracionario' not in line_lower:
            continue
        
        # Determine operation type: C = Compra, V = Venda
        op_type = OperationType.BUY
        if re.search(r'\bV\b', line):  # Look for standalone V
            op_type = OperationType.SELL
        
        # Try to find stock name and convert to ticker
        ticker = None
        
        # First try to find a standard ticker pattern
        ticker_match = BR_TICKER_PATTERN.search(line)
        if ticker_match:
            ticker = ticker_match.group(0)
        else:
            # Try to match company names
            for stock_name in STOCK_NAME_TO_TICKER.keys():
                if stock_name in line_lower:
                    ticker = STOCK_NAME_TO_TICKER[stock_name]
                    break
        
        if not ticker:
            continue
        
        # Extract numbers (Brazilian format: 1.234,56)
        numbers = re.findall(r'[\d.]+,\d{2}|\b\d+\b', line)
        parsed_numbers = []
        
        for n in numbers:
            try:
                # Convert Brazilian format to float
                if ',' in n:
                    clean = n.replace('.', '').replace(',', '.')
                else:
                    clean = n
                val = float(clean)
                if val > 0:
                    parsed_numbers.append(val)
            except ValueError:
                continue
        
        # Rico format: quantity, price, total, followed by D/C indicator
        # Skip small numbers that might be codes
        valid_numbers = [n for n in parsed_numbers if n != 1]  # Skip the "1" from "1-BOVESPA"
        
        if len(valid_numbers) >= 3:
            quantity = valid_numbers[0]
            price = valid_numbers[1]
            total = valid_numbers[2]
            
            # Validate: total should be approximately quantity * price
            expected_total = quantity * price
            if abs(total - expected_total) < 1:  # Allow R$1 difference for rounding
                operations.append({
                    "ticker": ticker,
                    "type": op_type,
                    "quantity": quantity,
                    "price": price,
                    "total": total
                })
    
    return operations


def parse_operations_from_text(text: str) -> List[Dict]:
    """
    Fallback: Extract operations from raw text when table parsing fails.
    Uses regex to find ticker patterns and associated numbers.
    """
    operations = []
    lines = text.split('\n')
    
    for line in lines:
        # Skip short lines
        if len(line) < 10:
            continue
        
        # Look for ticker patterns
        ticker_match = BR_TICKER_PATTERN.search(line)
        if not ticker_match:
            continue
        
        ticker = ticker_match.group(0)
        
        # Check if it's likely an operation line (has C or V indicator, or compra/venda)
        line_lower = line.lower()
        is_operation_line = (
            ' c ' in line_lower or 
            ' v ' in line_lower or 
            'compra' in line_lower or 
            'venda' in line_lower or
            'fracionario' in line_lower or
            'lote' in line_lower
        )
        
        if not is_operation_line:
            continue
        
        # Determine operation type
        op_type = OperationType.BUY
        if ' v ' in line_lower or 'venda' in line_lower:
            op_type = OperationType.SELL
        
        # Extract numbers from the line
        # Pattern for Brazilian numbers: 1.234,56 or just 123
        numbers = re.findall(r'[\d.]+,\d{2}|\d+', line)
        parsed_numbers = []
        
        for n in numbers:
            try:
                # Convert Brazilian format to float
                clean = n.replace('.', '').replace(',', '.')
                val = float(clean)
                if val > 0:
                    parsed_numbers.append(val)
            except ValueError:
                continue
        
        # Need at least 2 numbers (quantity and something else)
        if len(parsed_numbers) >= 2:
            # Heuristics based on Rico/XP format
            # Usually: quantity, price, total
            quantity = parsed_numbers[0]
            
            # Find price (a number between 1 and 10000 that's not quantity)
            price = 0
            for num in parsed_numbers[1:]:
                if 0.01 <= num <= 10000 and num != quantity:
                    price = num
                    break
            
            # Total is usually the largest number
            total = max(parsed_numbers) if parsed_numbers else quantity * price
            
            # Validate
            if quantity > 0 and (price > 0 or total > 0):
                if price == 0 and total > 0:
                    price = total / quantity if quantity > 0 else 0
                if total == 0:
                    total = quantity * price
                    
                operations.append({
                    "ticker": ticker,
                    "type": op_type,
                    "quantity": quantity,
                    "price": price,
                    "total": total
                })
    
    return operations


def extract_fees(text: str) -> Fees:
    """Extract fee breakdown from text"""
    fees = Fees()
    
    # Common fee patterns
    fee_patterns = {
        "brokerage": [r'corretagem[:\s]*([\d.,]+)', r'taxa de corretagem[:\s]*([\d.,]+)'],
        "settlement": [r'liquidação[:\s]*([\d.,]+)', r'taxa de liquidação[:\s]*([\d.,]+)'],
        "emoluments": [r'emolumentos[:\s]*([\d.,]+)'],
        "iss": [r'iss[:\s]*([\d.,]+)'],
        "irrf": [r'irrf[:\s]*([\d.,]+)', r'i\.r\.r\.f\.[:\s]*([\d.,]+)'],
    }
    
    for fee_type, patterns in fee_patterns.items():
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                try:
                    value = float(match.group(1).replace('.', '').replace(',', '.'))
                    setattr(fees, fee_type, value)
                    break
                except ValueError:
                    continue
    
    # Calculate total
    fees.total = (fees.brokerage + fees.settlement + fees.emoluments + 
                  fees.custody + fees.iss + fees.irrf + fees.other)
    
    return fees


def parse(pdf_bytes: bytes, password: str = None, debug: bool = False) -> ParseResponse:
    """
    Parse a Brazilian brokerage note PDF.
    
    Args:
        pdf_bytes: The PDF file contents as bytes
        password: Optional password for encrypted PDFs (usually CPF for Rico, XP, BTG, Clear)
        debug: If True, include raw_text in response for troubleshooting
        
    Returns:
        ParseResponse with extracted operations and fees
    """
    warnings = []
    
    try:
        # Extract text and tables from PDF
        # Try with password if provided, otherwise try without
        pdf_file = io.BytesIO(pdf_bytes)
        
        try:
            pdf = pdfplumber.open(pdf_file, password=password)
        except Exception as e:
            if "password" in str(e).lower() or "encrypted" in str(e).lower():
                return ParseResponse(
                    success=False,
                    warnings=["PDF is password-protected. Please provide your CPF (without dots/dashes) as the password."]
                )
            raise e
        
        with pdf:
            full_text = ""
            all_tables = []
            
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"
                
                tables = page.extract_tables()
                all_tables.extend(tables)
        
        # Identify broker
        broker = identify_broker(full_text)
        if not broker:
            warnings.append("Could not identify broker")
        
        # Extract note date
        note_date = extract_date(full_text)
        if not note_date:
            warnings.append("Could not extract note date")
        
        # Extract note number
        note_number = extract_note_number(full_text)
        
        # Parse operations - use broker-specific parser if detected
        raw_operations = []
        
        # Try Rico-specific parser first if it looks like a Rico note
        if broker == "Rico" or "bovespa" in full_text.lower():
            raw_operations = parse_rico_format(all_tables, full_text)
        
        # Fall back to generic table parser
        if not raw_operations:
            raw_operations = parse_operations_from_table(all_tables)
        
        # If still no operations, try text parsing
        if not raw_operations:
            warnings.append("No operations found in tables, trying text parsing...")
            raw_operations = parse_operations_from_text(full_text)
        
        if not raw_operations:
            warnings.append("No operations found. The PDF format may not be supported.")
        
        # Convert to Operation models
        operations = []
        for op in raw_operations:
            operations.append(Operation(
                ticker=op["ticker"],
                type=op["type"],
                asset_type=identify_asset_type(op["ticker"]),
                quantity=op["quantity"],
                price=op["price"],
                total=op["total"],
                currency="BRL",
                trade_date=note_date.strftime("%Y-%m-%d") if note_date else None
            ))
        
        # Extract fees
        fees = extract_fees(full_text)
        
        # Calculate net value
        total_operations = sum(op.total for op in operations)
        net_value = total_operations + fees.total
        
        return ParseResponse(
            success=True,
            broker=broker,
            note_date=note_date.strftime("%Y-%m-%d") if note_date else None,
            note_number=note_number,
            operations=operations,
            fees=fees,
            net_value=net_value,
            currency="BRL",
            raw_text=full_text[:2000] if debug else None,  # First 2000 chars for debugging
            warnings=warnings
        )
        
    except Exception as e:
        return ParseResponse(
            success=False,
            warnings=[f"Parse error: {str(e)}"]
        )

