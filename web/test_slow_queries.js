const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testSlowQueries() {
  console.log("🚀 Testing Slow Query Logging...\n");

  // 1. ساخت کاربر ادمین
  const adminEmail = `admin_${Date.now()}@test.com`;
  const { data: authData } = await supabase.auth.admin.createUser({
    email: adminEmail, password: 'Pass123!', email_confirm: true,
  });
  
  // ارتقا به ادمین
  await supabase.rpc('promote_to_admin', { user_id: authData.user.id });
  
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email: adminEmail, password: 'Pass123!',
  });
  const token = signInData.session.access_token;

  // 2. لاگ کردن یک کوئری کند (از طریق API)
  console.log("1. Logging a slow query...");
  const logRes = await fetch("http://localhost:3000/api/log-slow-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "SELECT * FROM creators WHERE followers_count > 1000",
      duration_ms: 1500,
    })
  });
  console.log(`   Status: ${logRes.status}\n`);

  // 3. خواندن کوئری‌های کند با API ادمین
  console.log("2. Fetching slow queries (Admin API)...");
  const fetchRes = await fetch("http://localhost:3000/api/admin/slow-queries", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await fetchRes.json();
  
  if (data.success && data.queries.length > 0) {
    console.log(`✅ Found ${data.queries.length} slow queries:`);
    data.queries.slice(0, 3).forEach(q => {
      console.log(`   - ${q.duration_ms}ms: ${q.query_text.substring(0, 50)}...`);
    });
    console.log("\n🎉 SLOW QUERY LOGGING WORKS!");
  } else {
    console.log(`❌ No slow queries found. Response:`, data);
  }
}
testSlowQueries();
