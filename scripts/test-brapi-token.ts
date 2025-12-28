
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.BRAPI_TOKEN || "public";
console.log("Testing Brapi Token:", token);

async function testToken() {
    const url = `https://brapi.dev/api/quote/PETR4?token=${token}`;
    try {
        const res = await fetch(url);
        console.log("Status:", res.status);
        if (res.ok) {
            const data = await res.json();
            console.log("Success! Data:", data.results[0].symbol, data.results[0].regularMarketPrice);
        } else {
            console.error("Error:", await res.text());
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testToken();
