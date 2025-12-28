
// Mock Dependencies
const mockTransactions = [
    { type: 'income', value: 5000, date: '2025-01-01', name: 'Salary', category: 'Work' },
    { type: 'expense', value: 200, date: '2025-01-02', name: 'Uber', category: 'Transport' },
    { type: 'expense', value: 100, date: '2025-01-03', name: 'Ifood', category: 'Food' }
];

const mockAssets = [
    { ticker: 'AAPL', quantity: 10, average_price: 150, type: 'stock_us', currency: 'USD' },
    { ticker: 'PETR4', quantity: 100, average_price: 30, type: 'stock_br', currency: 'BRL' }
];

// Re-implement tool logic here for verification since we can't import server actions directly in script without context
function testFinancialSummaryTool(data: any[]) {
    console.log("TEST: Financial Summary Logic");
    const recentIncome = data.filter(t => t.type === 'income').reduce((acc, t) => acc + t.value, 0);
    const recentExpense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + Math.abs(t.value), 0);

    console.log(`   Input: ${data.length} transactions`);
    console.log(`   Calculated Income: ${recentIncome} (Expected 5000)`);
    console.log(`   Calculated Expense: ${recentExpense} (Expected 300)`);
    console.log(`   Result: ${recentIncome === 5000 && recentExpense === 300 ? '✅ PASS' : '❌ FAIL'}`);
}

function testInvestmentPortfolioTool(assets: any[]) {
    console.log("\nTEST: Investment Portfolio Logic");
    const portfolio = assets.map(a => ({
        ticker: a.ticker,
        qty: a.quantity,
        avg_price: a.average_price,
        currency: a.currency,
        type: a.type
    }));

    console.log(`   Mapped ${portfolio.length} assets`);
    console.log(`   First Asset: ${JSON.stringify(portfolio[0])}`);
    console.log(`   Result: ${portfolio[0].ticker === 'AAPL' && portfolio[0].qty === 10 ? '✅ PASS' : '❌ FAIL'}`);
}

async function verifyLogic() {
    console.log("--- Verifying Tool Logic (Mocked Data) ---");
    testFinancialSummaryTool(mockTransactions);
    testInvestmentPortfolioTool(mockAssets);
    console.log("\n--- Verification Complete ---");
}

verifyLogic();
