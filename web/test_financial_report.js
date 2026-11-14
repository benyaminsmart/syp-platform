const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseAdmin = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testFinancialReport() {
  console.log("🚀 Testing Financial Report System...\n");

  // 1. ساخت کاربر ادمین
  const adminEmail = `admin_${Date.now()}@test.com`;
  const { data: authData } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail, password: 'Pass123!', email_confirm: true,
  });
  await supabaseAdmin.rpc('promote_to_admin', { user_id: authData.user.id });
  const { data: signInData } = await supabaseAdmin.auth.signInWithPassword({ email: adminEmail, password: 'Pass123!' });
  const adminToken = signInData.session.access_token;

  // 2. فراخوانی API گزارش
  console.log("1. Fetching financial report...");
  const res = await fetch("http://localhost:3000/api/admin/reports", {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  const data = await res.json();
  
  if (!data.success) return console.log("❌ Error:", data.error);

  console.log(`\n📊 Financial Summary:`);
  console.log(`   Total Revenue: $${data.summary.total_revenue}`);
  console.log(`   Total Transactions: ${data.summary.total_transactions}`);
  
  console.log(`\n📊 Revenue by Type:`);
  Object.entries(data.revenue_by_type).forEach(([type, revenue]) => {
    console.log(`   - ${type}: $${revenue.toFixed(2)}`);
  });
  
  console.log(`\n📊 Monthly Revenue:`);
  Object.entries(data.monthly_revenue).forEach(([month, revenue]) => {
    console.log(`   - ${month}: $${revenue.toFixed(2)}`);
  });
  
  console.log(`\n📊 Count by Type:`);
  Object.entries(data.count_by_type).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count} transactions`);
  });

  if (data.summary.total_transactions > 0) {
    console.log("\n🎉 FINANCIAL REPORT SYSTEM WORKS!");
  }
}
testFinancialReport();
