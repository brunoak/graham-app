
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// We need to mimic the logic from arkad-actions.ts but in a standalone script
// Since arkad-actions.ts uses "use server" and next/headers, we can't import it directly here easily 
// without complex transpilation.
// Instead, we will REPLICATE the logic here to verify the *algorithm* against real data.
// If this script produces good insights, we know the logic is sound, then we patch the prod code.

interface Transaction {
    amount: number;
    date: string;
    type: string;
    categories?: { name?: string };
}

interface Asset {
    ticker: string;
    quantity: number;
    type: string;
}

async function run() {
    console.log("--- Verifying Smart Insights Logic ---");

    // 1. Get a Test User (Bruno)
    // We'll search for a user with tenant variables
    const { data: users, error: userError } = await supabase.from('users').select('id, email, tenant_id').limit(1);

    if (userError || !users || users.length === 0) {
        console.error("No users found", userError);
        return;
    }

    const user = users[0];
    const tenant_id = user.tenant_id;
    console.log(`User: ${user.email} (Tenant: ${tenant_id})`);

    // --- DASHBOARD LOGIC TEST ---
    console.log("\n[TEST] Dashboard Insight (Spending Trend)");
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];

    // Grab Transactions
    const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, date, type')
        .eq('tenant_id', tenant_id)
        .gte('date', startOfLastMonth) as { data: Transaction[] | null };

    if (!transactions) {
        console.log("No transactions found.");
    } else {
        const isExpense = (t: Transaction) => t.type === 'expense' || t.amount < 0;

        const currentMonthExpenses = transactions
            .filter((t: Transaction) => isExpense(t) && t.date >= startOfCurrentMonth)
            .reduce((acc: number, t: Transaction) => acc + Math.abs(Number(t.amount)), 0);

        const lastMonthExpenses = transactions
            .filter((t: Transaction) => isExpense(t) && t.date >= startOfLastMonth && t.date < startOfCurrentMonth)
            .reduce((acc: number, t: Transaction) => acc + Math.abs(Number(t.amount)), 0);

        console.log(`Stats: Last Month R$${lastMonthExpenses.toFixed(2)} | This Month R$${currentMonthExpenses.toFixed(2)}`);

        if (lastMonthExpenses > 0) {
            const diff = currentMonthExpenses - lastMonthExpenses;
            const percent = ((diff / lastMonthExpenses) * 100).toFixed(0);
            console.log(`Algorithm Output: ${diff > 0 ? `Gastos subiram ${percent}%` : `Gastos caíram ${Math.abs(Number(percent))}%`}`);
        } else {
            console.log("Algorithm Output: Sem dados suficientes do mês passado.");
        }
    }

    // --- FINANCE LOGIC TEST (Top Category) ---
    console.log("\n[TEST] Finance Insight (Top Category)");
    const { data: financeTrans } = await supabase
        .from('transactions')
        .select('amount, categories(name)')
        .eq('tenant_id', tenant_id)
        .lt('amount', 0)
        .gte('date', startOfCurrentMonth) as { data: Transaction[] | null };

    if (financeTrans && financeTrans.length > 0) {
        const categoryTotals: Record<string, number> = {};
        financeTrans.forEach((t: Transaction) => {
            const catName = t.categories?.name || 'Outros';
            categoryTotals[catName] = (categoryTotals[catName] || 0) + Math.abs(Number(t.amount));
        });

        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        console.log(`Algorithm Output: Maior despesa é ${topCategory[0]} (R$ ${topCategory[1].toFixed(2)})`);
    } else {
        console.log("Algorithm Output: Sem despesas este mês.");
    }

    // --- INVESTMENTS LOGIC TEST (Diversification) ---
    console.log("\n[TEST] Investments Insight");
    const { data: assets } = await supabase
        .from('assets')
        .select('ticker, quantity, type') // added type for diversity check
        .eq('tenant_id', tenant_id)
        .gt('quantity', 0) as { data: Asset[] | null };

    if (assets) {
        console.log(`Assets Found: ${assets.length}`);
        const types = new Set(assets.map((a: Asset) => a.type));
        console.log(`Unique Types: ${Array.from(types).join(', ')}`);

        if (types.size < 2 && assets.length > 2) {
            console.log("Algorithm Output: Carteira pouco diversificada (Aviso de risco).");
        } else {
            console.log(`Algorithm Output: Você possui ${assets.length} ativos.`);
        }
    }
}

run();
