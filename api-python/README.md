# Graham PDF Parser - Python Microservice

API service for parsing brokerage notes from Brazilian and international brokers.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn main:app --reload --port 8000

# Run tests
pytest
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/parse/br-nota` | Parse Brazilian brokerage note |
| POST | `/parse/ibkr` | Parse IBKR Activity Statement |
| POST | `/parse/generic` | Generic PDF parser (fallback) |
| GET | `/health` | Health check |

## Supported Brokers

### Brazil
- Clear Corretora
- XP Investimentos
- Rico
- BTG Pactual
- Nuinvest
- Inter

### International
- Interactive Brokers (IBKR)
- Avenue (soon)
- XP Global (soon)
- Inter Global (soon)

## Deploy

This service is designed to be deployed on Railway.

```bash
# Railway CLI
railway up
```
