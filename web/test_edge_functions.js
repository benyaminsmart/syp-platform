async function testEdgeFunctions() {
  console.log("🚀 Testing Edge Functions...\n");

  // 1. تست API CSRF (Edge)
  console.log("Test 1: Fetching CSRF token from Edge Function...");
  try {
    const res = await fetch("http://localhost:3000/api/csrf");
    const data = await res.json();
    
    if (data.csrfToken) {
      console.log(`   ✅ CSRF Token received: ${data.csrfToken.substring(0, 30)}...`);
    } else {
      console.log(`   ❌ No CSRF token. Response:`, data);
    }
  } catch (err) {
    console.log(`   ❌ CSRF API failed:`, err.message);
  }

  console.log();

  // 2. تست API Generate Code (Edge)
  console.log("Test 2: Generating claim code from Edge Function...");
  try {
    const res = await fetch("http://localhost:3000/api/claim/generate-code", { method: "POST" });
    const data = await res.json();
    
    if (data.code) {
      console.log(`   ✅ Claim code received: ${data.code}`);
    } else {
      console.log(`   ❌ No claim code. Response:`, data);
    }
  } catch (err) {
    console.log(`   ❌ Claim code API failed:`, err.message);
  }

  console.log("\n🎉 EDGE FUNCTIONS TEST FINISHED!");
}
testEdgeFunctions();
