const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testConstraints() {
  console.log("🚀 Testing Database Length Constraints...\n");

  const { data: creator } = await supabase.from('creators').select('id').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found");

  // 1. تست از طریق API (Zod باید 400 بدهد)
  console.log("Test 1: Sending 2000 chars via API (Zod should block with 400)");
  const csrfRes = await fetch("http://localhost:3000/api/csrf");
  const { csrfToken } = await csrfRes.json();

  let res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "x-csrf-token": csrfToken,
      "x-idempotency-key": crypto.randomUUID()
    },
    body: JSON.stringify({
      creator_id: creator.id,
      brand_email: "test@example.com",
      brand_name: "Test Brand",
      campaign_brief: "A".repeat(2000), // ۲۰۰۰ کاراکتر (بیش از حد مجاز)
      budget: 500
    })
  });
  let data = await res.json();
  console.log(`Status: ${res.status} | Error: ${data.error || 'None'}\n`);

  // 2. تست مستقیم دیتابیس (با دور زدن Zod)
  console.log("Test 2: Sending 2000 chars directly to DB (Should be BLOCKED by DB constraint)");
  const { error: dbError } = await supabase.from('bookings').insert({
    creator_id: creator.id,
    brand_email: "db_test@example.com",
    brand_name: "DB Test Brand",
    campaign_brief: "B".repeat(2000), // ۲۰۰۰ کاراکتر
    budget: 500,
    amount_usd: 500,
    platform_fee_usd: 50,
    status: "pending_payment"
  });

  if (dbError) {
    console.log(`✅ DB BLOCKED! Error: ${dbError.message}`);
    console.log("🎉 DATABASE LENGTH CONSTRAINTS WORK!");
  } else {
    console.log("❌ WARNING: DB accepted the long text. Constraint failed.");
  }
}
testConstraints();
