export const mockFinancialData = {
    balance: 12500.00,
    income: 8500.00,
    expenses: 3200.00,
    investments: 150000.00
}

export const mockTransactions = [
    { id: 1, name: "Growth Supplements", category: "Saúde", description: "Transferência enviada", value: -265.34, amount: -265.34, date: "03/11/25", via: "Nubank", status: "Sucesso" },
    { id: 2, name: "Enrique de Souza", category: "Transferência", description: "Transferência enviada", value: -20.00, amount: -20.00, date: "06/11/25", via: "Nubank", status: "Sucesso" },
    { id: 3, name: "Transferência Recebida", category: "Outros (Renda)", description: "Entrada", value: 5057.34, amount: 5057.34, date: "06/11/25", via: "Nubank", status: "Sucesso" },
    { id: 4, name: "Nu Pagamentos", category: "Liberdade Financeira", description: "Transferência enviada", value: 3968.18, amount: 3968.18, date: "09/11/25", via: "Nubank", status: "Sucesso" },
    { id: 5, name: "Bruno Martins", category: "Transferência", description: "Pix enviado", value: -10.00, amount: -10.00, date: "10/11/25", via: "Rico Investimentos", status: "Sucesso" },
    { id: 6, name: "Transferência recebida", category: "Outros (Renda)", description: "Entrada", value: 10.00, amount: 10.00, date: "10/11/25", via: "Rico Investimentos", status: "Sucesso" },
    { id: 7, name: "Petshop", category: "Outros (Necessidades básicas)", description: "Transferência enviada", value: -22.00, amount: -22.00, date: "10/11/25", via: "Nubank", status: "Sucesso" },
]

// Mock Data Type
export interface InvestmentMock {
    id: number
    ticker: string
    name: string
    type: "stock" | "fii" | "crypto" | "treasury" | "etf" | "fixed_income"
    quantity: number
    avgPrice: number
    currentPrice: number
    currency: "BRL" | "USD"
}

// Mock Data
export const MOCK_INVESTMENTS: InvestmentMock[] = [
    // US Stocks & ETFs
    { id: 1, ticker: "NVDA", name: "NVIDIA Corp", type: "stock", quantity: 15, avgPrice: 450.00, currentPrice: 880.00, currency: "USD" },
    { id: 2, ticker: "MSFT", name: "Microsoft Corp", type: "stock", quantity: 20, avgPrice: 280.00, currentPrice: 420.00, currency: "USD" },
    { id: 3, ticker: "AMZN", name: "Amazon.com Inc", type: "stock", quantity: 30, avgPrice: 130.00, currentPrice: 180.00, currency: "USD" },
    { id: 4, ticker: "AAPL", name: "Apple Inc", type: "stock", quantity: 45, avgPrice: 150.00, currentPrice: 175.00, currency: "USD" },
    { id: 5, ticker: "GOOGL", name: "Alphabet Inc", type: "stock", quantity: 10, avgPrice: 100.00, currentPrice: 160.00, currency: "USD" },
    { id: 6, ticker: "VOO", name: "Vanguard S&P 500 ETF", type: "etf", quantity: 50, avgPrice: 350.00, currentPrice: 480.00, currency: "USD" },
    { id: 7, ticker: "VT", name: "Vanguard Total World Stock", type: "etf", quantity: 40, avgPrice: 90.00, currentPrice: 110.00, currency: "USD" },
    { id: 8, ticker: "SCHD", name: "Schwab US Dividend Equity", type: "etf", quantity: 60, avgPrice: 70.00, currentPrice: 78.00, currency: "USD" },
    { id: 9, ticker: "SGOV", name: "iShares 0-3 Month Treasury", type: "etf", quantity: 100, avgPrice: 100.00, currentPrice: 100.50, currency: "USD" },
    { id: 10, ticker: "SHV", name: "iShares Short Treasury Bond", type: "etf", quantity: 50, avgPrice: 110.00, currentPrice: 110.20, currency: "USD" },
    { id: 11, ticker: "VNQ", name: "Vanguard Real Estate ETF", type: "etf", quantity: 35, avgPrice: 80.00, currentPrice: 85.00, currency: "USD" },
    { id: 12, ticker: "TLT", name: "iShares 20+ Year Treasury", type: "etf", quantity: 25, avgPrice: 95.00, currentPrice: 92.00, currency: "USD" },

    // BR Stocks
    { id: 13, ticker: "ITUB4", name: "Itaú Unibanco", type: "stock", quantity: 500, avgPrice: 28.50, currentPrice: 33.20, currency: "BRL" },
    { id: 14, ticker: "VALE3", name: "Vale S.A.", type: "stock", quantity: 300, avgPrice: 68.00, currentPrice: 62.50, currency: "BRL" },
    { id: 15, ticker: "SAPR11", name: "Sanepar", type: "stock", quantity: 400, avgPrice: 18.20, currentPrice: 24.50, currency: "BRL" },
    { id: 16, ticker: "ALUP11", name: "Alupar", type: "stock", quantity: 200, avgPrice: 26.00, currentPrice: 30.10, currency: "BRL" },
    { id: 17, ticker: "GOAU4", name: "Metalúrgica Gerdau", type: "stock", quantity: 250, avgPrice: 10.50, currentPrice: 11.20, currency: "BRL" },
    { id: 18, ticker: "B3SA3", name: "B3 S.A.", type: "stock", quantity: 300, avgPrice: 12.00, currentPrice: 11.50, currency: "BRL" },
    { id: 19, ticker: "TAEE3", name: "Taesa", type: "stock", quantity: 150, avgPrice: 34.00, currentPrice: 35.80, currency: "BRL" },
    { id: 20, ticker: "CMIG4", name: "Cemig", type: "stock", quantity: 400, avgPrice: 9.50, currentPrice: 11.80, currency: "BRL" },
    { id: 21, ticker: "SUZB3", name: "Suzano", type: "stock", quantity: 200, avgPrice: 48.00, currentPrice: 54.00, currency: "BRL" },
    { id: 22, ticker: "SLCE3", name: "SLC Agrícola", type: "stock", quantity: 100, avgPrice: 18.00, currentPrice: 19.50, currency: "BRL" },

    // FIIs
    { id: 23, ticker: "HGLG11", name: "CSHG Logística", type: "fii", quantity: 80, avgPrice: 160.00, currentPrice: 163.50, currency: "BRL" },
    { id: 24, ticker: "VILG11", name: "Vinci Logística", type: "fii", quantity: 100, avgPrice: 95.00, currentPrice: 92.00, currency: "BRL" },
    { id: 25, ticker: "XPML11", name: "XP Malls", type: "fii", quantity: 120, avgPrice: 110.00, currentPrice: 115.00, currency: "BRL" },
    { id: 26, ticker: "LVBI11", name: "VBI Logística", type: "fii", quantity: 60, avgPrice: 114.00, currentPrice: 118.00, currency: "BRL" },
    { id: 27, ticker: "HGRE11", name: "CSHG Real Estate", type: "fii", quantity: 50, avgPrice: 125.00, currentPrice: 130.00, currency: "BRL" },
    { id: 28, ticker: "KNSC11", name: "Kinea Securities", type: "fii", quantity: 150, avgPrice: 88.00, currentPrice: 91.50, currency: "BRL" },
    { id: 29, ticker: "AFHI11", name: "AF Invest CRI", type: "fii", quantity: 90, avgPrice: 94.00, currentPrice: 96.00, currency: "BRL" },
    { id: 30, ticker: "RBRY11", name: "Valora RE", type: "fii", quantity: 110, avgPrice: 98.00, currentPrice: 101.00, currency: "BRL" },
    { id: 31, ticker: "JSRE11", name: "Safra Real Estate", type: "fii", quantity: 70, avgPrice: 75.00, currentPrice: 72.00, currency: "BRL" },
    { id: 32, ticker: "PCIP11", name: "Pátria Infra", type: "fii", quantity: 40, avgPrice: 85.00, currentPrice: 89.00, currency: "BRL" }, // Infra as FII for mock

    // Crypto
    { id: 33, ticker: "BITH11", name: "Hashdex Bitcoin ETF", type: "crypto", quantity: 200, avgPrice: 60.00, currentPrice: 85.00, currency: "BRL" },

    // Treasury & Fixed Income
    { id: 34, ticker: "SELIC 2031", name: "Tesouro Selic 2031", type: "treasury", quantity: 5.5, avgPrice: 12500.00, currentPrice: 13200.00, currency: "BRL" },
    { id: 35, ticker: "IPCA+ 2045", name: "Tesouro IPCA+ 2045", type: "treasury", quantity: 12, avgPrice: 1800.00, currentPrice: 2100.00, currency: "BRL" },
    { id: 36, ticker: "CDB MASTER", name: "CDB Pós 128% CDI", type: "fixed_income", quantity: 1, avgPrice: 10000.00, currentPrice: 11500.00, currency: "BRL" },
    { id: 37, ticker: "CDB XP", name: "CDB Pós 124% CDI", type: "fixed_income", quantity: 1, avgPrice: 5000.00, currentPrice: 5600.00, currency: "BRL" },

    // Cash
    { id: 38, ticker: "CASH USD", name: "Conta Avenue (Dólar)", type: "treasury", quantity: 1, avgPrice: 2500.00, currentPrice: 2500.00, currency: "USD" },
]
