const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testCSRF() {
  console.log("🚀 Testing CSRF Protection...\n");

  const { data: creator } = await supabase.from('creators').select('id').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found");

  const validBody = {
    creator_id: creator.id,
    brand_email: "test@example.com",
    brand_name: "Test Brand",
    campaign_brief: "This is a valid campaign brief.",
    budget: 500
  };

  // تست ۱: بدون توکن CSRF
  console.log("Test 1: Request WITHOUT CSRF Token (Expected: 403)");
  let res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validBody)
  });
  let data = await res.json();
  console.log(`Status: ${res.status} | Error: ${data.error}\n`);

  // تست ۲: با توکن CSRF نامعتبر
  console.log("Test 2: Request WITH INVALID CSRF Token (Expected: 403)");
  res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-csrf-token": "fake.token.here"
    },
    body: JSON.stringify(validBody)
  });
  data = await res.json();
  console.log(`Status: ${res.status} | Error: ${data.error}\n`);

  // تست ۳: با توکن CSRF معتبر (دریافت از API)
  console.log("Test 3: Request WITH VALID CSRF Token (Expected: 201)");
  const csrfRes = await fetch("http://localhost:3000/api/csrf");
  const csrfData = await csrfRes.json();
  const validToken = csrfData.csrfToken;
  console.log(`Got valid token: ${validToken.substring(0, 20)}...`);

  res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-csrf-token": validToken
    },
    body: JSON.stringify(validBody)
  });
  data = await res.json();
  console.log(`Status: ${res.status} | Success: ${data.success || 'Failed'}\n`);

  console.log("🎉 CSRF PROTECTION TEST FINISHED!");
}
testCSRF();
