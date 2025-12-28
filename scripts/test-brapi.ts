
const BRAPI_TOKEN = "h2T2i2j2k2l2m2n2o2p2"; // Placeholder, will rely on ENV or I'll paste the token if needed. Wait, I shouldn't paste tokens.
// I will access the file using the environment variable approach or just run it via 'npx tsx' which might load .env.local if configured.
// Actually, I can just use the existing service function by importing it?
// `src/lib/services/market-service.ts` uses `process.env.BRAPI_TOKEN`.

import { getMarketQuote } from "../src/lib/services/market-service"

async function testTickers() {
    const tickers = ["^BVSP", "USDBRL", "USDBRL=X", "BTC-USD", "BTC", "^GSPC"]

    console.log("Testing Tickers...")

    for (const t of tickers) {
        try {
            const result = await getMarketQuote(t)
            console.log(`Ticker: ${t} -> Found: ${!!result}, Price: ${result?.regularMarketPrice}`)
        } catch (e) {
            console.log(`Ticker: ${t} -> Error`)
        }
    }
}

testTickers()
