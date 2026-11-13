async function testRateLimit() {
  console.log("🚀 Testing Rate Limiting (Max: 5 requests/min)...\n");
  
  for (let i = 1; i <= 6; i++) {
    try {
      const res = await fetch("http://localhost:3000/api/claim/generate-code", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.100" } // شبیه‌سازی یک IP ثابت
      });
      
      const data = await res.json();
      
      if (res.status === 429) {
        console.log(`❌ Request ${i}: BLOCKED (429 Too Many Requests) - Rate Limit Works!`);
      } else if (res.ok) {
        console.log(`✅ Request ${i}: Success (Code: ${data.code}) - Remaining: ${res.headers.get('X-RateLimit-Remaining')}`);
      } else {
        console.log(`⚠️ Request ${i}: Status ${res.status} - ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.log(`💥 Request ${i} crashed:`, err.message);
    }
  }
}
testRateLimit();
