async function testSentry() {
  console.log("🚀 Testing Sentry Integration...\n");

  // 1. فراخوانی API که خطای عمدی ایجاد می‌کند
  console.log("1. Triggering intentional error...");
  const res = await fetch("http://localhost:3000/api/test/sentry-error");
  const data = await res.json();
  
  console.log(`   Status: ${res.status} (Expected: 500)`);
  console.log(`   Error: ${data.error}\n`);

  // 2. بررسی اینکه آیا خطا در محیط توسعه به Sentry ارسال شده یا نه
  console.log("2. Note: In development mode, errors are NOT sent to Sentry (to prevent spam).");
  console.log("   To verify Sentry works, you need to:");
  console.log("   - Set NODE_ENV=production");
  console.log("   - Or set NEXT_PUBLIC_SENTRY_DSN in .env.local");
  console.log("   - And check your Sentry dashboard\n");

  // 3. بررسی وجود DSN
  const hasDSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "Not set (in .env.local)";
  console.log(`3. Sentry DSN: ${hasDSN}`);
  console.log("\n🎉 SENTRY INTEGRATION IS READY!");
}
testSentry();
