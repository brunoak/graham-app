"""
Pydantic models for API request/response validation.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Union
from datetime import date as DateType
from enum import Enum


class OperationType(str, Enum):
    """Type of trading operation"""
    BUY = "buy"
    SELL = "sell"


class AssetType(str, Enum):
    """Type of asset"""
    STOCK_BR = "stock_br"
    STOCK_US = "stock_us"
    REIT_BR = "reit_br"  # FII
    REIT_US = "reit_us"
    ETF_BR = "etf_br"
    ETF_US = "etf_us"
    OPTION = "option"
    FUTURE = "future"
    BOND = "bond"
    OTHER = "other"


class Operation(BaseModel):
    """Single trading operation from brokerage note"""
    ticker: str = Field(..., description="Asset ticker symbol")
    name: Optional[str] = Field(default=None, description="Asset name/description")
    type: OperationType
    asset_type: AssetType = AssetType.OTHER
    quantity: float = Field(..., gt=0)
    price: float = Field(..., ge=0, description="Price per unit")
    total: float = Field(..., description="Total value (quantity * price)")
    currency: str = Field(default="BRL", description="Currency code")
    trade_date: Optional[str] = Field(default=None, description="Trade date (YYYY-MM-DD)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "ticker": "PETR4",
                "name": "PETROBRAS PN",
                "type": "buy",
                "asset_type": "stock_br",
                "quantity": 100,
                "price": 35.50,
                "total": 3550.00,
                "currency": "BRL",
                "date": "2024-01-15"
            }
        }


class Fees(BaseModel):
    """Fee breakdown from brokerage note"""
    brokerage: float = Field(0, ge=0, description="Brokerage fee (corretagem)")
    settlement: float = Field(0, ge=0, description="Settlement fee (taxa de liquidação)")
    emoluments: float = Field(0, ge=0, description="Exchange fees (emolumentos)")
    custody: float = Field(0, ge=0, description="Custody fee")
    iss: float = Field(0, ge=0, description="ISS tax")
    irrf: float = Field(0, ge=0, description="Withholding tax (IRRF)")
    other: float = Field(0, ge=0, description="Other fees")
    total: float = Field(0, ge=0, description="Total fees")

    class Config:
        json_schema_extra = {
            "example": {
                "brokerage": 4.90,
                "settlement": 0.25,
                "emoluments": 0.03,
                "custody": 0,
                "iss": 0.25,
                "irrf": 0,
                "other": 0,
                "total": 5.43
            }
        }


class ParseResponse(BaseModel):
    """Response from parsing a brokerage note"""
    success: bool = True
    broker: Optional[str] = Field(default=None, description="Broker name")
    note_date: Optional[str] = Field(default=None, description="Note date (YYYY-MM-DD)")
    note_number: Optional[str] = Field(default=None, description="Brokerage note number")
    operations: List[Operation] = Field(default_factory=list)
    fees: Optional[Fees] = None
    net_value: Optional[float] = Field(default=None, description="Net value (total operations + fees)")
    currency: str = Field(default="BRL", description="Primary currency")
    raw_text: Optional[str] = Field(default=None, description="Raw extracted text (for debugging)")
    warnings: List[str] = Field(default_factory=list, description="Parse warnings")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "broker": "Clear Corretora",
                "date": "2024-01-15",
                "note_number": "123456",
                "operations": [
                    {
                        "ticker": "PETR4",
                        "type": "buy",
                        "quantity": 100,
                        "price": 35.50,
                        "total": 3550.00
                    }
                ],
                "fees": {
                    "total": 5.43
                },
                "net_value": 3555.43,
                "currency": "BRL",
                "warnings": []
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    parsers: List[str]
