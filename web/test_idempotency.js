const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto'); // برای تولید UUID معتبر
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testIdempotency() {
  console.log("🚀 Testing Idempotency Key...\n");

  const { data: creator } = await supabase.from('creators').select('id').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found");

  const csrfRes = await fetch("http://localhost:3000/api/csrf");
  const { csrfToken } = await csrfRes.json();

  // تولید یک UUID استاندارد و معتبر
  const idempotencyKey = crypto.randomUUID();
  console.log(`🔑 Generated UUID: ${idempotencyKey}\n`);

  const body = {
    creator_id: creator.id,
    brand_email: "test@example.com",
    brand_name: "Test Brand",
    campaign_brief: "This is a valid campaign brief.",
    budget: 500
  };

  console.log("Test 1: First request with idempotency key (Expected: 201)");
  let res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
      "x-idempotency-key": idempotencyKey
    },
    body: JSON.stringify(body)
  });
  let data = await res.json();
  console.log(`Status: ${res.status} | Success: ${data.success || 'Failed'}\n`);

  console.log("Test 2: SAME request again (Expected: 409 Conflict - Duplicate)");
  res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
      "x-idempotency-key": idempotencyKey
    },
    body: JSON.stringify(body)
  });
  data = await res.json();
  console.log(`Status: ${res.status} | Error: ${data.error || 'None'}\n`);

  console.log("🎉 IDEMPOTENCY TEST FINISHED!");
}
testIdempotency();
