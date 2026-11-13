async function testCircuitBreaker() {
  console.log("🚀 Testing Circuit Breaker (Simulating DB Failure)...\n");

  const validBody = {
    creator_id: "00000000-0000-0000-0000-000000000000", // ID نامعتبر برای شبیه‌سازی خطا
    brand_email: "test@example.com",
    brand_name: "Test Brand",
    campaign_brief: "This is a valid campaign brief.",
    budget: 500
  };

  // ابتدا یک توکن CSRF معتبر می‌گیریم (چون API ما به آن نیاز دارد)
  const csrfRes = await fetch("http://localhost:3000/api/csrf");
  const { csrfToken } = await csrfRes.json();

  // ۴ بار درخواست می‌فرستیم. ۳ بار اول باید خطای معمولی (500) بدهند،
  // اما بار چهارم باید توسط Circuit Breaker بلاک شود (503).
  for (let i = 1; i <= 4; i++) {
    console.log(`Attempt ${i}:`);
    const res = await fetch("http://localhost:3000/api/bookings/create", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken
      },
      body: JSON.stringify(validBody)
    });
    
    const data = await res.json();
    console.log(`  Status: ${res.status} | Error: ${data.error}\n`);
    
    // کمی صبر می‌کنیم تا مطمئن شویم درخواست‌ها همزمان نیستند
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log("🎉 CIRCUIT BREAKER TEST FINISHED!");
}
testCircuitBreaker();
