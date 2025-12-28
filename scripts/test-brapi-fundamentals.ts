
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.BRAPI_TOKEN;
console.log("Testing Brapi Token on Fundamentals:", token?.substring(0, 5) + "...");

async function testFundamentals() {
    // Exact URL pattern from market-service.ts
    const ticker = "PETR4";
    const modules = "summaryProfile,financialData,defaultKeyStatistics,balanceSheetHistory,incomeStatementHistory,price";
    const url = `https://brapi.dev/api/quote/${ticker}?token=${token}&modules=${modules}`;

    console.log("Fetching URL (masked):", url.replace(token || "", "TOKEN"));

    try {
        const res = await fetch(url);
        console.log("Status:", res.status);
        if (res.ok) {
            const data = await res.json();
            console.log("Success!");
        } else {
            console.error("Error Text:", await res.text());
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testFundamentals();
