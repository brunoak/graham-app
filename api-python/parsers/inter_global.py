"""
Inter Global (Inter Co Securities LLC) Parser

Parses Transaction Confirmation PDFs from Inter's US securities business.
Company: Inter Co Securities LLC, Miami FL
"""

import re
import io
from datetime import datetime
from typing import List, Optional
import pdfplumber

from models.schemas import ParseResponse, Operation, Fees, OperationType, AssetType


def identify_asset_type(symbol: str, security_name: str) -> AssetType:
    """Identify asset type from symbol and security name"""
    name_lower = security_name.lower() if security_name else ""
    
    if 'etf' in name_lower or symbol in ['TLT', 'SPY', 'QQQ', 'IVV', 'VTI', 'VOO']:
        return AssetType.ETF_US
    if 'reit' in name_lower:
        return AssetType.REIT_US
    
    return AssetType.STOCK_US


def parse_inter_global_text(text: str) -> List[dict]:
    """
    Parse Inter Global transaction confirmation format.
    
    Expected format in text:
    Symbol Security A/CType Action Execution Time Quantity Price Trade Date Settle Date Capacity
    TLT ISHARES TR 20 YR TR BD ETF M Buy 1:11:34 PM 1 90.3799 10/31/2025 11/3/2025 Agency
    """
    operations = []
    lines = text.split('\n')
    
    current_symbol = None
    current_security = None
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Look for transaction lines with known symbols or "Buy"/"Sell"
        line_lower = line.lower()
        
        # Try to find action (Buy/Sell)
        has_action = 'buy' in line_lower or 'sell' in line_lower
        
        if has_action:
            # Try to parse the transaction line
            # Format varies, but usually: Symbol Security... Action ... Quantity Price TradeDate
            
            parts = line.split()
            
            # Find Buy or Sell position
            action_idx = None
            for idx, part in enumerate(parts):
                if part.lower() in ['buy', 'sell']:
                    action_idx = idx
                    break
            
            if action_idx is not None:
                # Symbol is usually the first part
                symbol = parts[0] if parts else None
                
                # Action
                action = parts[action_idx].lower()
                op_type = OperationType.BUY if action == 'buy' else OperationType.SELL
                
                # Security name is between symbol and action
                security = ' '.join(parts[1:action_idx]) if action_idx > 1 else ""
                
                # Numbers after action: Execution Time, Quantity, Price, Trade Date
                # Find numeric values
                numbers = []
                dates = []
                
                for part in parts[action_idx+1:]:
                    # Check for date pattern (MM/DD/YYYY)
                    if re.match(r'\d{1,2}/\d{1,2}/\d{4}', part):
                        dates.append(part)
                    # Check for number (including decimals)
                    elif re.match(r'^\d+\.?\d*$', part):
                        numbers.append(float(part))
                
                if numbers and len(numbers) >= 2:
                    # Usually: Quantity, Price
                    quantity = numbers[0]
                    price = numbers[1]
                    total = quantity * price
                    
                    trade_date = None
                    if dates:
                        try:
                            trade_date = datetime.strptime(dates[0], "%m/%d/%Y")
                        except ValueError:
                            pass
                    
                    if symbol and quantity > 0:
                        operations.append({
                            "symbol": symbol,
                            "security": security,
                            "type": op_type,
                            "quantity": quantity,
                            "price": price,
                            "total": total,
                            "trade_date": trade_date
                        })
    
    return operations


def parse_inter_global_tables(tables: List, text: str) -> List[dict]:
    """
    Parse Inter Global transactions from PDF tables.
    """
    operations = []
    
    for table in tables:
        if not table:
            continue
        
        for row in table:
            if not row or not any(row):
                continue
            
            row_text = ' '.join(str(cell) for cell in row if cell)
            row_lower = row_text.lower()
            
            # Look for Buy/Sell
            if 'buy' not in row_lower and 'sell' not in row_lower:
                continue
            
            # Determine action
            op_type = OperationType.BUY if 'buy' in row_lower else OperationType.SELL
            
            # Find symbol (3-5 uppercase letters at start)
            symbol_match = re.match(r'^([A-Z]{2,5})\b', row_text)
            symbol = symbol_match.group(1) if symbol_match else None
            
            if not symbol:
                continue
            
            # Extract numbers
            numbers = re.findall(r'\d+\.?\d*', row_text)
            float_numbers = [float(n) for n in numbers if float(n) > 0]
            
            # Find dates (MM/DD/YYYY)
            dates = re.findall(r'\d{1,2}/\d{1,2}/\d{4}', row_text)
            
            if len(float_numbers) >= 2:
                # Heuristic: smaller number is quantity, larger is price (unless fractional)
                quantity = float_numbers[0]
                price = float_numbers[1]
                total = quantity * price
                
                trade_date = None
                if dates:
                    try:
                        trade_date = datetime.strptime(dates[0], "%m/%d/%Y")
                    except ValueError:
                        pass
                
                operations.append({
                    "symbol": symbol,
                    "security": "",
                    "type": op_type,
                    "quantity": quantity,
                    "price": price,
                    "total": total,
                    "trade_date": trade_date
                })
    
    return operations


def parse(pdf_bytes: bytes, password: str = None, debug: bool = False) -> ParseResponse:
    """
    Parse Inter Global (US) transaction confirmation PDF.
    
    Args:
        pdf_bytes: The PDF file contents as bytes
        password: Optional password (usually not needed for Inter Global)
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
        
        # Identify Inter Global
        is_inter_global = (
            "inter co securities" in full_text.lower() or
            "inter.co" in full_text.lower() or
            "transaction confirmation" in full_text.lower()
        )
        
        broker = "Inter Global" if is_inter_global else None
        if not broker:
            warnings.append("Could not confirm this is an Inter Global document")
        
        # Extract confirmation date
        note_date = None
        date_match = re.search(r'confirmation date\s*:\s*(\d{1,2}/\d{1,2}/\d{4})', full_text.lower())
        if date_match:
            try:
                note_date = datetime.strptime(date_match.group(1), "%m/%d/%Y")
            except ValueError:
                pass
        
        if not note_date:
            warnings.append("Could not extract confirmation date")
        
        # Parse operations
        raw_operations = parse_inter_global_text(full_text)
        
        if not raw_operations:
            raw_operations = parse_inter_global_tables(all_tables, full_text)
        
        if not raw_operations:
            warnings.append("No transactions found in the document")
        
        # Convert to Operation models
        operations = []
        for op in raw_operations:
            operations.append(Operation(
                ticker=op["symbol"],
                name=op.get("security"),
                type=op["type"],
                asset_type=identify_asset_type(op["symbol"], op.get("security", "")),
                quantity=op["quantity"],
                price=op["price"],
                total=op["total"],
                currency="USD",
                trade_date=op["trade_date"].strftime("%Y-%m-%d") if op.get("trade_date") else None
            ))
        
        # Calculate net value
        net_value = sum(op.total for op in operations)
        
        return ParseResponse(
            success=len(operations) > 0,
            broker=broker,
            note_date=note_date.strftime("%Y-%m-%d") if note_date else None,
            operations=operations,
            fees=Fees(),  # Inter Global shows fees per transaction, would need more parsing
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
