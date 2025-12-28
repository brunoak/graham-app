
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

async function test() {
    console.log("Testing Yahoo Finance...");
    try {
        const tickers = ["^BVSP", "USDBRL=X", "^GSPC"];
        const results = await yahooFinance.quote(tickers);
        console.log("Success! Found:", Array.isArray(results) ? results.length : "Single Result");
        if (Array.isArray(results)) {
            results.forEach((r: any) => console.log(`${r.symbol}: ${r.regularMarketPrice}`));
        } else {
            console.log(results);
        }
    } catch (e) {
        console.error("Error Details:", e);
    }
}

test();
