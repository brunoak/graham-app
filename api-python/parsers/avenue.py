"""
Avenue Securities Parser

Parses PDF transaction confirmations from Avenue Securities.
Cleared by: Apex Clearing Corporation, Dallas TX
"""

import re
import io
from datetime import datetime
from typing import List, Optional
import pdfplumber

from models.schemas import ParseResponse, Operation, Fees, OperationType, AssetType


# Common US ETFs and known symbols
US_ETFS = {'SPY', 'QQQ', 'VTI', 'VOO', 'IVV', 'VEA', 'VWO', 'ARKK', 'TLT', 'GLD'}


def identify_asset_type(symbol: str, description: str = "") -> AssetType:
    """Identify asset type from symbol and description"""
    desc_lower = description.lower() if description else ""
    
    if symbol in US_ETFS or 'etf' in desc_lower:
        return AssetType.ETF_US
    if 'reit' in desc_lower:
        return AssetType.REIT_US
    
    return AssetType.STOCK_US


def parse_avenue_text(text: str) -> List[dict]:
    """
    Parse Avenue transaction format from text.
    
    Format: Acct Type, B/S, Trade Date, Settle Date, QTY, SYM, PRICE, Principal, COMM, Tran Fee, Add'l Fees, Tag Number, Net Amount
    Example line: 1 B 12/16/22 12/20/22 0.99965 AMZN 87.2299000 87.20 0.00 0.00 0.00 R4313 87.20
    """
    operations = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Look for B (Buy) or S (Sell) indicator
        parts = line.split()
        if len(parts) < 7:
            continue
        
        # Try to find B or S action
        action_idx = None
        for idx, part in enumerate(parts):
            if part == 'B' or part == 'S':
                action_idx = idx
                break
        
        if action_idx is None:
            continue
        
        op_type = OperationType.BUY if parts[action_idx] == 'B' else OperationType.SELL
        
        # After B/S, expect: Trade Date, Settle Date, QTY, SYM, PRICE, ...
        remaining = parts[action_idx + 1:]
        
        if len(remaining) < 5:
            continue
        
        # Find dates (MM/DD/YY format)
        trade_date = None
        date_count = 0
        data_start = 0
        
        for i, part in enumerate(remaining):
            if re.match(r'\d{1,2}/\d{1,2}/\d{2,4}', part):
                if date_count == 0:
                    try:
                        if len(part.split('/')[-1]) == 2:
                            trade_date = datetime.strptime(part, "%m/%d/%y")
                        else:
                            trade_date = datetime.strptime(part, "%m/%d/%Y")
                    except ValueError:
                        pass
                date_count += 1
            else:
                if date_count >= 1:  # After at least one date
                    data_start = i
                    break
        
        # Now parse: QTY, SYM, PRICE
        data_parts = remaining[data_start:]
        
        if len(data_parts) < 3:
            continue
        
        # Find quantity (decimal number)
        quantity = None
        symbol = None
        price = None
        
        for i, part in enumerate(data_parts):
            # Quantity is usually a decimal like 0.99965 or 2.01981
            if quantity is None and re.match(r'^\d+\.\d+$', part):
                try:
                    quantity = float(part)
                    # Next should be symbol (2-5 uppercase letters)
                    if i + 1 < len(data_parts) and re.match(r'^[A-Z]{1,5}$', data_parts[i + 1]):
                        symbol = data_parts[i + 1]
                        # Next should be price
                        if i + 2 < len(data_parts):
                            try:
                                price = float(data_parts[i + 2])
                            except ValueError:
                                pass
                except ValueError:
                    pass
        
        # Try alternative: symbol first then quantity
        if not symbol:
            for i, part in enumerate(data_parts):
                if re.match(r'^[A-Z]{1,5}$', part) and part not in ['B', 'S', 'USD']:
                    symbol = part
                    # Look for numbers around it
                    numbers = re.findall(r'\d+\.?\d*', ' '.join(data_parts))
                    float_nums = [float(n) for n in numbers if float(n) > 0]
                    
                    if len(float_nums) >= 2:
                        # Smallest is usually quantity (fractional shares)
                        sorted_nums = sorted(float_nums)
                        quantity = sorted_nums[0]
                        price = sorted_nums[1] if sorted_nums[1] > 1 else sorted_nums[-1]
                    break
        
        if symbol and quantity and quantity > 0:
            total = quantity * price if price else 0
            
            operations.append({
                "symbol": symbol,
                "type": op_type,
                "quantity": quantity,
                "price": price if price else 0,
                "total": total,
                "trade_date": trade_date
            })
    
    return operations


def parse(pdf_bytes: bytes, password: str = None, debug: bool = False) -> ParseResponse:
    """
    Parse Avenue Securities transaction confirmation PDF.
    
    Args:
        pdf_bytes: The PDF file contents as bytes
        password: Optional password (usually not needed for Avenue)
        debug: If True, include raw_text in response
        
    Returns:
        ParseResponse with extracted operations
    """
    warnings = []
    
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        
        try:
            pdf = pdfplumber.open(pdf_file, password=password)
        except Exception as e:
            if "password" in str(e).lower() or "encrypted" in str(e).lower():
                return ParseResponse(
                    success=False,
                    warnings=["PDF is password-protected. Please provide the password."]
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
        
        # Identify Avenue
        is_avenue = (
            "avenue" in full_text.lower() or
            "apex clearing" in full_text.lower()
        )
        
        broker = "Avenue" if is_avenue else None
        if not broker:
            warnings.append("Could not confirm this is an Avenue document")
        
        # Extract trade date from summary
        note_date = None
        date_match = re.search(r'current trade date[:\s]*(\d{1,2}/\d{1,2}/\d{2,4})', full_text.lower())
        if date_match:
            try:
                date_str = date_match.group(1)
                if len(date_str.split('/')[-1]) == 2:
                    note_date = datetime.strptime(date_str, "%m/%d/%y")
                else:
                    note_date = datetime.strptime(date_str, "%m/%d/%Y")
            except ValueError:
                pass
        
        # Try "ProcessDate" format
        if not note_date:
            date_match = re.search(r'processdate[:\s]*(\d{1,2}/\d{1,2}/\d{4})', full_text.lower())
            if date_match:
                try:
                    note_date = datetime.strptime(date_match.group(1), "%m/%d/%Y")
                except ValueError:
                    pass
        
        if not note_date:
            warnings.append("Could not extract trade date")
        
        # Parse operations from text
        raw_operations = parse_avenue_text(full_text)
        
        if not raw_operations:
            warnings.append("No transactions found. The PDF format may have changed.")
        
        # Convert to Operation models
        operations = []
        for op in raw_operations:
            operations.append(Operation(
                ticker=op["symbol"],
                type=op["type"],
                asset_type=identify_asset_type(op["symbol"]),
                quantity=op["quantity"],
                price=op["price"],
                total=op["total"],
                currency="USD",
                trade_date=op["trade_date"].strftime("%Y-%m-%d") if op.get("trade_date") else None
            ))
        
        # Calculate totals
        net_value = sum(op.total for op in operations)
        
        return ParseResponse(
            success=len(operations) > 0,
            broker=broker,
            note_date=note_date.strftime("%Y-%m-%d") if note_date else None,
            operations=operations,
            fees=Fees(),
            net_value=net_value,
            currency="USD",
            raw_text=full_text[:2000] if debug else None,
            warnings=warnings
        )
        
    except Exception as e:
        return ParseResponse(
            success=False,
            warnings=[f"Parse error: {str(e)}"]
        )
