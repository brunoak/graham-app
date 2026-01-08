"""
Interactive Brokers (IBKR) Statement Parser

Parses PDF Activity Statements and CSV trade exports from Interactive Brokers.
"""

import re
import io
import csv
from datetime import datetime
from typing import List, Optional
import pdfplumber

from models.schemas import ParseResponse, Operation, Fees, OperationType, AssetType


def identify_asset_type_from_category(category: str, ticker: str) -> AssetType:
    """Identify asset type from IBKR category and ticker"""
    category_lower = category.lower() if category else ""
    
    if 'etf' in category_lower:
        return AssetType.ETF_US
    if 'reit' in category_lower:
        return AssetType.REIT_US
    if 'option' in category_lower or len(ticker) > 10:
        return AssetType.OPTION
    if 'future' in category_lower:
        return AssetType.FUTURE
    if 'bond' in category_lower or 'treasury' in category_lower:
        return AssetType.BOND
    
    return AssetType.STOCK_US


def parse_csv(csv_bytes: bytes) -> ParseResponse:
    """
    Parse IBKR CSV trade export.
    
    Expected columns: Symbol, Date/Time, Quantity, T. Price, Proceeds, Comm/Fee
    """
    warnings = []
    operations = []
    total_fees = 0
    
    try:
        # Try to decode as UTF-8
        text = csv_bytes.decode('utf-8')
        reader = csv.DictReader(io.StringIO(text))
        
        for row in reader:
            try:
                # Extract ticker
                ticker = row.get('Symbol', '').strip()
                if not ticker:
                    continue
                
                # Parse quantity (negative = sell)
                quantity_str = row.get('Quantity', '0')
                quantity = float(quantity_str.replace(',', ''))
                
                op_type = OperationType.BUY if quantity > 0 else OperationType.SELL
                quantity = abs(quantity)
                
                # Parse price
                price_str = row.get('T. Price', row.get('Price', '0'))
                price = float(price_str.replace(',', ''))
                
                # Parse total proceeds
                proceeds_str = row.get('Proceeds', row.get('Amount', '0'))
                total = abs(float(proceeds_str.replace(',', '')))
                
                # Parse fee
                fee_str = row.get('Comm/Fee', row.get('Commission', '0'))
                fee = abs(float(fee_str.replace(',', '')))
                total_fees += fee
                
                # Parse date
                date_str = row.get('Date/Time', row.get('TradeDate', ''))
                trade_date = None
                for fmt in ['%Y-%m-%d, %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y%m%d', '%m/%d/%Y']:
                    try:
                        trade_date = datetime.strptime(date_str.split(',')[0].strip(), fmt)
                        break
                    except ValueError:
                        continue
                
                # Get asset category if available
                category = row.get('Asset Category', row.get('AssetClass', ''))
                
                operations.append(Operation(
                    ticker=ticker,
                    type=op_type,
                    asset_type=identify_asset_type_from_category(category, ticker),
                    quantity=quantity,
                    price=price,
                    total=total,
                    currency="USD",
                    trade_date=trade_date.strftime("%Y-%m-%d") if trade_date else None
                ))
                
            except (ValueError, KeyError) as e:
                warnings.append(f"Error parsing row: {str(e)}")
                continue
        
        fees = Fees(brokerage=total_fees, total=total_fees)
        total_value = sum(op.total for op in operations)
        
        return ParseResponse(
            success=True,
            broker="Interactive Brokers",
            operations=operations,
            fees=fees,
            net_value=total_value + total_fees,
            currency="USD",
            warnings=warnings
        )
        
    except Exception as e:
        return ParseResponse(
            success=False,
            warnings=[f"CSV parse error: {str(e)}"]
        )


def parse_pdf(pdf_bytes: bytes) -> ParseResponse:
    """
    Parse IBKR Activity Statement PDF.
    
    Note: PDF parsing is more complex due to varying formats.
    This is a best-effort extraction.
    """
    warnings = []
    operations = []
    
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            full_text = ""
            all_tables = []
            
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"
                
                tables = page.extract_tables()
                all_tables.extend(tables)
        
        # Try to find the trades section
        in_trades_section = False
        
        for table in all_tables:
            if not table:
                continue
            
            for row in table:
                if not row or not any(row):
                    continue
                
                row_text = " ".join(str(cell) for cell in row if cell)
                
                # Detect trades section
                if 'trades' in row_text.lower() and 'summary' not in row_text.lower():
                    in_trades_section = True
                    continue
                
                if not in_trades_section:
                    continue
                
                # Try to extract trade info
                # IBKR format varies, but usually has: Symbol, Date, Quantity, Price, Proceeds
                
                # Look for stock ticker pattern (1-5 uppercase letters)
                ticker_match = re.search(r'\b([A-Z]{1,5})\b', row_text)
                if not ticker_match:
                    continue
                
                ticker = ticker_match.group(1)
                
                # Skip common false positives
                if ticker in ['USD', 'EUR', 'GBP', 'CAD', 'BUY', 'SELL', 'DATE', 'TOTAL']:
                    continue
                
                # Extract numbers
                numbers = re.findall(r'-?[\d,]+\.?\d*', row_text)
                numbers = [float(n.replace(',', '')) for n in numbers if n and n != '.']
                
                if len(numbers) >= 2:
                    # Heuristic: quantity is usually an integer
                    quantity = abs(numbers[0])
                    price = abs(numbers[1]) if len(numbers) > 1 else 0
                    total = abs(numbers[2]) if len(numbers) > 2 else quantity * price
                    
                    # Determine buy/sell
                    op_type = OperationType.SELL if numbers[0] < 0 else OperationType.BUY
                    
                    operations.append(Operation(
                        ticker=ticker,
                        type=op_type,
                        asset_type=AssetType.STOCK_US,
                        quantity=quantity,
                        price=price,
                        total=total,
                        currency="USD"
                    ))
        
        if not operations:
            warnings.append("No trades found in PDF. Consider using CSV export for better results.")
        
        # Extract fees from text
        fees = Fees()
        fee_match = re.search(r'total\s+commission[:\s]*([\d.,]+)', full_text.lower())
        if fee_match:
            fees.brokerage = float(fee_match.group(1).replace(',', ''))
            fees.total = fees.brokerage
        
        total_value = sum(op.total for op in operations)
        
        return ParseResponse(
            success=True,
            broker="Interactive Brokers",
            operations=operations,
            fees=fees,
            net_value=total_value + fees.total,
            currency="USD",
            warnings=warnings
        )
        
    except Exception as e:
        return ParseResponse(
            success=False,
            warnings=[f"PDF parse error: {str(e)}"]
        )


def parse(file_bytes: bytes, is_csv: bool = False) -> ParseResponse:
    """
    Parse IBKR statement (PDF or CSV).
    
    Args:
        file_bytes: The file contents as bytes
        is_csv: True if the file is a CSV, False for PDF
        
    Returns:
        ParseResponse with extracted operations and fees
    """
    if is_csv:
        return parse_csv(file_bytes)
    else:
        return parse_pdf(file_bytes)
