"""
Generic PDF Parser

Fallback parser using tabula for unrecognized brokerage notes.
Attempts to extract tables and identify trading operations.
"""

import re
import io
from datetime import datetime
from typing import List, Optional
import pdfplumber

from models.schemas import ParseResponse, Operation, Fees, OperationType, AssetType


# Common ticker patterns
TICKER_PATTERNS = [
    re.compile(r'\b([A-Z]{4,6})(\d{1,2})F?\b'),  # Brazilian (PETR4, VALE3)
    re.compile(r'\b([A-Z]{1,5})\b'),              # US stocks (AAPL, MSFT)
]

# Common words that look like tickers but aren't
TICKER_BLACKLIST = {
    'USD', 'BRL', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY',  # Currencies
    'BUY', 'SELL', 'DATE', 'TIME', 'TOTAL', 'QTD', 'QTDE',  # Headers
    'NOTA', 'CORR', 'TAXA', 'VALOR', 'PRECO', 'TIPO',  # Portuguese
    'STOCK', 'BOND', 'ETF', 'REIT', 'PRICE', 'AMOUNT',  # English
    'THE', 'AND', 'FOR', 'NOT', 'ARE', 'BUT', 'WAS',  # Common words
}


def extract_operations_from_tables(tables: List) -> List[Operation]:
    """
    Try to extract operations from PDF tables using heuristics.
    """
    operations = []
    
    for table in tables:
        if not table:
            continue
        
        # Skip small tables (likely headers/footers)
        if len(table) < 2:
            continue
        
        for row in table:
            if not row or not any(row):
                continue
            
            row_text = " ".join(str(cell) for cell in row if cell)
            
            # Try to find a ticker
            ticker = None
            for pattern in TICKER_PATTERNS:
                match = pattern.search(row_text)
                if match:
                    potential_ticker = match.group(0)
                    if potential_ticker not in TICKER_BLACKLIST:
                        ticker = potential_ticker
                        break
            
            if not ticker:
                continue
            
            # Extract all numbers from the row
            numbers = re.findall(r'-?[\d.,]+', row_text)
            parsed_numbers = []
            for n in numbers:
                try:
                    # Handle Brazilian format (1.234,56) and US format (1,234.56)
                    # Heuristic: if comma is after the last period, it's decimal
                    last_comma = n.rfind(',')
                    last_period = n.rfind('.')
                    
                    if last_comma > last_period:
                        # Brazilian format: 1.234,56
                        n = n.replace('.', '').replace(',', '.')
                    else:
                        # US format: 1,234.56
                        n = n.replace(',', '')
                    
                    parsed_numbers.append(float(n))
                except ValueError:
                    continue
            
            # Need at least 2 numbers (quantity and price)
            if len(parsed_numbers) < 2:
                continue
            
            # Determine operation type
            op_type = OperationType.BUY
            row_lower = row_text.lower()
            if 'venda' in row_lower or ' v ' in row_lower or 'sell' in row_lower:
                op_type = OperationType.SELL
            
            # Heuristics for quantity, price, total
            # Usually: quantity is smaller, price per unit, total is larger
            sorted_nums = sorted(parsed_numbers)
            
            quantity = parsed_numbers[0] if parsed_numbers[0] < 10000 else 1
            price = parsed_numbers[1] if len(parsed_numbers) > 1 else 0
            total = parsed_numbers[-1] if len(parsed_numbers) > 2 else quantity * price
            
            # Validate: total should be approximately quantity * price
            if total > 0 and abs(total - quantity * price) / total > 0.1:
                # Recalculate
                total = quantity * price
            
            # Determine asset type
            asset_type = AssetType.OTHER
            if re.match(r'[A-Z]{4}11$', ticker):
                asset_type = AssetType.REIT_BR  # FII
            elif re.match(r'[A-Z]{4,6}\d{1,2}', ticker):
                asset_type = AssetType.STOCK_BR
            elif len(ticker) <= 5:
                asset_type = AssetType.STOCK_US
            
            operations.append(Operation(
                ticker=ticker,
                type=op_type,
                asset_type=asset_type,
                quantity=abs(quantity),
                price=abs(price),
                total=abs(total),
                currency="BRL"  # Default to BRL, can be overridden
            ))
    
    return operations


def parse(pdf_bytes: bytes) -> ParseResponse:
    """
    Generic PDF parser for unrecognized brokerage notes.
    
    Args:
        pdf_bytes: The PDF file contents as bytes
        
    Returns:
        ParseResponse with best-effort extracted operations
    """
    warnings = ["Using generic parser - results may be incomplete"]
    
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            full_text = ""
            all_tables = []
            
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"
                
                tables = page.extract_tables()
                all_tables.extend(tables)
        
        # Try to detect currency
        currency = "BRL"
        if 'usd' in full_text.lower() or '$' in full_text:
            if 'r$' not in full_text.lower():
                currency = "USD"
        
        # Extract operations
        operations = extract_operations_from_tables(all_tables)
        
        # Update currency on all operations
        for op in operations:
            op.currency = currency
        
        if not operations:
            warnings.append("No operations could be extracted. Please check the PDF format.")
        
        # Try to extract date
        note_date = None
        date_patterns = [
            r'(\d{2}/\d{2}/\d{4})',
            r'(\d{4}-\d{2}-\d{2})',
        ]
        for pattern in date_patterns:
            match = re.search(pattern, full_text)
            if match:
                for fmt in ['%d/%m/%Y', '%Y-%m-%d']:
                    try:
                        note_date = datetime.strptime(match.group(1), fmt)
                        break
                    except ValueError:
                        continue
                if note_date:
                    break
        
        total_value = sum(op.total for op in operations)
        
        return ParseResponse(
            success=len(operations) > 0,
            broker=None,
            note_date=note_date.strftime("%Y-%m-%d") if note_date else None,
            operations=operations,
            fees=Fees(),
            net_value=total_value,
            currency=currency,
            raw_text=full_text[:1000] if not operations else None,  # Include for debugging
            warnings=warnings
        )
        
    except Exception as e:
        return ParseResponse(
            success=False,
            warnings=[f"Generic parse error: {str(e)}"]
        )
