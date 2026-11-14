async function testSecurityHeaders() {
  console.log("🚀 Testing Security Headers...\n");

  const res = await fetch("http://localhost:3000");
  
  const headers = {
    "X-Frame-Options": res.headers.get("x-frame-options"),
    "X-Content-Type-Options": res.headers.get("x-content-type-options"),
    "X-XSS-Protection": res.headers.get("x-xss-protection"),
    "Content-Security-Policy": res.headers.get("content-security-policy") ? "Present" : "Missing",
    "Referrer-Policy": res.headers.get("referrer-policy"),
  };

  console.log("📊 Security Headers:");
  Object.entries(headers).forEach(([key, value]) => {
    const status = value ? "✅" : "❌";
    console.log(`   ${status} ${key}: ${value || "MISSING"}`);
  });

  const allPresent = Object.values(headers).every(v => v !== null);
  
  if (allPresent) {
    console.log("\n🎉 SECURITY HEADERS WORKS!");
  } else {
    console.log("\n⚠️ Some headers are missing.");
  }
}
testSecurityHeaders();
