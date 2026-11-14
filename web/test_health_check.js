async function testHealthCheck() {
  console.log("🚀 Testing Health Check API...\n");

  const res = await fetch("http://localhost:3000/api/health");
  const data = await res.json();

  console.log(`📊 Overall Status: ${data.status.toUpperCase()} (HTTP ${res.status})`);
  console.log(`⏱️  Response Time: ${data.latency_ms}ms`);
  console.log(`🕐 Timestamp: ${data.timestamp}\n`);

  console.log("📊 Component Checks:");
  Object.entries(data.checks).forEach(([name, check]) => {
    const icon = check.status === "UP" ? "✅" : "❌";
    const latency = check.latency ? ` (${check.latency}ms)` : "";
    const error = check.error ? ` - ${check.error}` : "";
    console.log(`   ${icon} ${name}: ${check.status}${latency}${error}`);
  });

  if (res.status === 200 && data.status === "healthy") {
    console.log("\n🎉 HEALTH CHECK WORKS! Ready for UptimeRobot.");
    console.log("\n📌 Next Steps:");
    console.log("   1. Deploy to VPS/Vercel with a public domain");
    console.log("   2. Go to https://uptimerobot.com (free account)");
    console.log("   3. Add monitor: https://yourdomain.com/api/health");
    console.log("   4. Set alert email/phone");
  } else {
    console.log("\n⚠️ Health check returned unhealthy status.");
  }
}
testHealthCheck();
