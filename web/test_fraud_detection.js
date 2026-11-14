const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseAdmin = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testFraudDetection() {
  console.log("🚀 Testing Fraud Detection System...\n");

  // 1. ساخت یک تراکنش عادی (زیر حد)
  const { data: normalTx } = await supabaseAdmin.from('transactions').insert({
    brand_email: "normal_brand@test.com",
    amount: 5000,
    platform_fee: 500,
    creator_payout: 4500,
    transaction_type: "payment",
    status: "completed",
  }).select().single();

  console.log(`Test 1: Normal transaction ($5,000)...`);
  let res = await fetch("http://localhost:3000/api/fraud/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction_id: normalTx.id })
  });
  let data = await res.json();
  console.log(`   Alerts triggered: ${data.alerts_triggered} (Expected: 0)\n`);

  // 2. ساخت یک تراکنش با مبلغ بسیار بالا
  const { data: highAmountTx } = await supabaseAdmin.from('transactions').insert({
    brand_email: "high_roller@test.com",
    amount: 100000,
    platform_fee: 10000,
    creator_payout: 90000,
    transaction_type: "payment",
    status: "completed",
  }).select().single();

  console.log(`Test 2: High amount transaction ($100,000)...`);
  res = await fetch("http://localhost:3000/api/fraud/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction_id: highAmountTx.id })
  });
  data = await res.json();
  console.log(`   Alerts triggered: ${data.alerts_triggered} (Expected: 1)`);
  if (data.alerts && data.alerts.length > 0) {
    console.log(`   Alert reason: ${data.alerts[0].reason}\n`);
  }

  // 3. بررسی ثبت هشدار در دیتابیس
  console.log("Verifying alerts in DB...");
  await new Promise(r => setTimeout(r, 500));
  const { data: dbAlerts } = await supabaseAdmin
    .from('suspicious_transactions')
    .select('*')
    .eq('transaction_id', highAmountTx.id);

  if (dbAlerts && dbAlerts.length > 0) {
    console.log(`✅ Alert saved in DB: ${dbAlerts[0].severity} - ${dbAlerts[0].reason.substring(0, 50)}...`);
    console.log("\n🎉 FRAUD DETECTION SYSTEM WORKS!");
  } else {
    console.log("❌ Alert not found in DB.");
  }
}
testFraudDetection();
