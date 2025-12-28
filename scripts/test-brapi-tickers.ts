
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.BRAPI_TOKEN;
const tickers = ["PETR4", "WEGE3", "AAPL", "VOO"];

async function testTickers() {
    console.log(`Token Raw: '${token}'`);
    if (token) {
        console.log(`Token Length: ${token.length}`);
        console.log(`Token Codes: ${token.split('').map(c => c.charCodeAt(0)).join(',')}`);
    }

    for (const ticker of tickers) {
        const url = `https://brapi.dev/api/quote/${ticker}?token=${token}`;
        try {
            const res = await fetch(url);
            console.log(`${ticker}: ${res.status} ${res.statusText}`);
            if (!res.ok) {
                const text = await res.text();
                // console.log(`   Body: ${text}`); 
            } else {
                const data = await res.json();
                console.log(`   Price: ${data.results[0]?.regularMarketPrice}`);
            }
        } catch (e) {
            console.error(`${ticker}: Failed - ${e}`);
        }
    }
}

testTickers();
