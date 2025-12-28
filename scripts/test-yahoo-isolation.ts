
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function testYahoo() {
    console.log("Testing Yahoo Finance...");
    const tickers = ["^BVSP", "USDBRL=X", "^GSPC", "^IXIC", "BTC-USD"];
    try {
        const results = await yahooFinance.quote(tickers) as any;
        console.log("Yahoo Results:", Array.isArray(results) ? results.length : 1);
        if (Array.isArray(results)) {
            results.forEach((r: any) => console.log(`- ${r.symbol}: ${r.regularMarketPrice}`));
        } else {
            console.log(`- ${results.symbol}: ${results.regularMarketPrice}`);
        }
    } catch (e) {
        console.error("Yahoo Failed:", e);
    }
}

testYahoo();
