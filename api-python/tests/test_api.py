"""
Comprehensive unit tests for all PDF parsers.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime

from main import app
from models.schemas import OperationType, AssetType
from parsers import br_nota, inter_global, avenue, ibkr


client = TestClient(app)


# =============================================================================
# API Endpoint Tests
# =============================================================================

class TestHealthEndpoint:
    """Tests for health check endpoint"""
    
    def test_health_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert len(data["parsers"]) >= 4


class TestFileValidation:
    """Tests for file type validation"""
    
    def test_br_nota_rejects_non_pdf(self):
        response = client.post(
            "/parse/br-nota",
            files={"file": ("test.txt", b"not a pdf", "text/plain")}
        )
        assert response.status_code == 400
        assert "PDF" in response.json()["detail"]
    
    def test_avenue_rejects_non_pdf(self):
        response = client.post(
            "/parse/avenue",
            files={"file": ("test.xlsx", b"not a pdf", "application/vnd.ms-excel")}
        )
        assert response.status_code == 400
    
    def test_inter_global_rejects_non_pdf(self):
        response = client.post(
            "/parse/inter-global",
            files={"file": ("test.doc", b"not a pdf", "application/msword")}
        )
        assert response.status_code == 400


# =============================================================================
# BR Nota Parser Tests  
# =============================================================================

class TestBRNotaBrokerIdentification:
    """Tests for Brazilian broker identification"""
    
    def test_identify_rico(self):
        text = "RICO CORRETORA DE TITULOS E VALORES MOBILIARIOS S.A."
        assert br_nota.identify_broker(text) == "Rico"
    
    def test_identify_clear(self):
        text = "CLEAR CORRETORA - GRUPO XP"
        assert br_nota.identify_broker(text) == "Clear"
    
    def test_identify_xp(self):
        text = "XP INVESTIMENTOS CCTVM S.A."
        assert br_nota.identify_broker(text) == "XP"
    
    def test_identify_nuinvest(self):
        text = "NUINVEST CORRETORA"
        assert br_nota.identify_broker(text) == "Nuinvest"
    
    def test_identify_btg(self):
        text = "BTG PACTUAL CTVM S.A."
        assert br_nota.identify_broker(text) == "BTG Pactual"
    
    def test_identify_inter(self):
        text = "INTER DTVM LTDA"
        assert br_nota.identify_broker(text) == "Inter"


class TestBRNotaAssetTypeIdentification:
    """Tests for Brazilian asset type identification"""
    
    def test_identify_fii(self):
        assert br_nota.identify_asset_type("HGLG11") == AssetType.REIT_BR
        assert br_nota.identify_asset_type("KNRI11") == AssetType.REIT_BR
        assert br_nota.identify_asset_type("MXRF11") == AssetType.REIT_BR
    
    def test_identify_etf(self):
        assert br_nota.identify_asset_type("BOVA11") == AssetType.ETF_BR
        assert br_nota.identify_asset_type("IVVB11") == AssetType.ETF_BR
    
    def test_identify_stock(self):
        assert br_nota.identify_asset_type("PETR4") == AssetType.STOCK_BR
        assert br_nota.identify_asset_type("VALE3") == AssetType.STOCK_BR


class TestBRNotaDateExtraction:
    """Tests for date extraction from Brazilian notes"""
    
    def test_extract_date_pregao_format(self):
        text = "Data pregão: 15/01/2024"
        result = br_nota.extract_date(text)
        assert result is not None
        assert result.day == 15
        assert result.month == 1
        assert result.year == 2024
    
    def test_extract_date_simple_format(self):
        text = "Nota emitida em 22/10/2021"
        result = br_nota.extract_date(text)
        assert result is not None
        assert result.year == 2021


class TestBRNotaStockNameMapping:
    """Tests for stock name to ticker mapping"""
    
    def test_cemig_mapping(self):
        result = br_nota.name_to_ticker("CEMIG PN N1")
        assert result == "CMIG4"
    
    def test_taesa_mapping(self):
        result = br_nota.name_to_ticker("TAESA ON N2")
        assert result == "TAEE11"
    
    def test_petrobras_mapping(self):
        result = br_nota.name_to_ticker("PETROBRAS PN")
        assert result == "PETR4"


# =============================================================================
# Inter Global Parser Tests
# =============================================================================

class TestInterGlobalAssetType:
    """Tests for Inter Global asset type identification"""
    
    def test_identify_etf(self):
        assert inter_global.identify_asset_type("TLT", "iShares 20 Year Treasury ETF") == AssetType.ETF_US
        assert inter_global.identify_asset_type("SPY", "SPDR S&P 500 ETF") == AssetType.ETF_US
    
    def test_identify_stock(self):
        assert inter_global.identify_asset_type("AAPL", "Apple Inc") == AssetType.STOCK_US
        assert inter_global.identify_asset_type("MSFT", "Microsoft Corp") == AssetType.STOCK_US


# =============================================================================
# Avenue Parser Tests
# =============================================================================

class TestAvenueAssetType:
    """Tests for Avenue asset type identification"""
    
    def test_identify_common_etf(self):
        assert avenue.identify_asset_type("SPY") == AssetType.ETF_US
        assert avenue.identify_asset_type("QQQ") == AssetType.ETF_US
        assert avenue.identify_asset_type("VTI") == AssetType.ETF_US
    
    def test_identify_stock(self):
        assert avenue.identify_asset_type("AMZN") == AssetType.STOCK_US
        assert avenue.identify_asset_type("GOOGL") == AssetType.STOCK_US


# =============================================================================
# IBKR Parser Tests
# =============================================================================

class TestIBKRCSVParsing:
    """Tests for Interactive Brokers CSV parsing"""
    
    def test_parse_buy_order(self):
        csv_data = b"""Symbol,Date/Time,Quantity,T. Price,Proceeds,Comm/Fee
AAPL,2024-01-15,100,185.50,18550.00,-1.00
"""
        result = ibkr.parse_csv(csv_data)
        
        assert result.success == True
        assert len(result.operations) == 1
        
        op = result.operations[0]
        assert op.ticker == "AAPL"
        assert op.type == OperationType.BUY
        assert op.quantity == 100
        assert op.price == 185.50
    
    def test_parse_sell_order(self):
        csv_data = b"""Symbol,Date/Time,Quantity,T. Price,Proceeds,Comm/Fee
MSFT,2024-01-15,-50,380.25,-19012.50,-1.00
"""
        result = ibkr.parse_csv(csv_data)
        
        assert result.success == True
        assert len(result.operations) == 1
        
        op = result.operations[0]
        assert op.ticker == "MSFT"
        assert op.type == OperationType.SELL
        assert op.quantity == 50  # Absolute value
    
    def test_parse_multiple_orders(self):
        csv_data = b"""Symbol,Date/Time,Quantity,T. Price,Proceeds,Comm/Fee
AAPL,2024-01-15,100,185.50,18550.00,-1.00
GOOGL,2024-01-15,50,142.00,7100.00,-1.00
MSFT,2024-01-16,-25,380.25,-9506.25,-0.50
"""
        result = ibkr.parse_csv(csv_data)
        
        assert result.success == True
        assert len(result.operations) == 3
        assert result.broker == "Interactive Brokers"


class TestIBKRAssetType:
    """Tests for IBKR asset type identification"""
    
    def test_identify_option(self):
        # Options typically have long tickers
        result = ibkr.identify_asset_type_from_category("option", "AAPL230120C00150000")
        assert result == AssetType.OPTION
    
    def test_identify_stock(self):
        result = ibkr.identify_asset_type_from_category("Stocks", "AAPL")
        assert result == AssetType.STOCK_US


# =============================================================================
# Integration Tests with Mock PDFs
# =============================================================================

class TestEmptyPDFHandling:
    """Tests for handling empty or minimal PDFs"""
    
    def test_br_nota_handles_empty_pdf(self):
        # Minimal valid PDF structure
        minimal_pdf = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj
xref
0 3
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
trailer << /Size 3 /Root 1 0 R >>
startxref
115
%%EOF"""
        
        response = client.post(
            "/parse/br-nota",
            files={"file": ("empty.pdf", minimal_pdf, "application/pdf")}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should return but with warnings
        assert "warnings" in data


# =============================================================================
# Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling"""
    
    def test_br_nota_unknown_broker(self):
        text = "Some random corretora that doesn't exist"
        result = br_nota.identify_broker(text)
        assert result is None
    
    def test_empty_text_date_extraction(self):
        result = br_nota.extract_date("")
        assert result is None
    
    def test_invalid_ticker_format(self):
        # Should not match invalid patterns
        import re
        pattern = br_nota.BR_TICKER_PATTERN
        assert pattern.search("ABC") is None  # Too short
        assert pattern.search("12345") is None  # Numbers only
