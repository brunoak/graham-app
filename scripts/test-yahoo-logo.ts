
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function testYahooLogo() {
    const tickers = ["AAPL", "VOO", "WEGE3.SA", "XPML11.SA"];

    console.log("Fetching quoteSummary for tickers...");

    for (const ticker of tickers) {
        try {
            // Fetch assetProfile and summaryProfile to look for 'website' or similar fields
            const result = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile', 'summaryProfile'] });

            const website = result.assetProfile?.website || result.summaryProfile?.website;
            console.log(`\nTicker: ${ticker}`);
            console.log(`Website: ${website}`);
            // console.log("AssetProfile:", JSON.stringify(result.assetProfile, null, 2));
        } catch (e: any) {
            console.error(`Failed for ${ticker}: ${e.message}`);
        }
    }
}

testYahooLogo();
