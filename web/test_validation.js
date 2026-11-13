const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testValidation() {
  const { data: creator } = await supabase.from('creators').select('id').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found");

  console.log("🚀 Testing Zod Input Validation...\n");

  // تست ۱: ایمیل نامعتبر و مبلغ منفی
  console.log("Test 1: Invalid Email & Negative Budget (Should be REJECTED)");
  let res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creator_id: creator.id,
      brand_email: "not-an-email", // نامعتبر
      brand_name: "Test Brand",
      campaign_brief: "This is a valid brief for testing purposes.",
      budget: -500 // نامعتبر
    })
  });
  let result = await res.json();
  console.log(`Status: ${res.status} (Expected 400) | Error: ${result.error || 'None'}`);
  console.log("-".repeat(50));

  // تست ۲: متن بیش از حد طولانی
  console.log("Test 2: Campaign Brief Too Long (Should be REJECTED)");
  res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creator_id: creator.id,
      brand_email: "valid@example.com",
      brand_name: "Test Brand",
      campaign_brief: "A".repeat(1500), // بیش از ۱۰۰۰ کاراکتر
      budget: 500
    })
  });
  result = await res.json();
  console.log(`Status: ${res.status} (Expected 400) | Error: ${result.error || 'None'}`);
  console.log("-".repeat(50));

  // تست ۳: داده کاملاً معتبر
  console.log("Test 3: Valid Data (Should be ACCEPTED)");
  res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creator_id: creator.id,
      brand_email: "valid@example.com",
      brand_name: "Valid Brand",
      campaign_brief: "This is a perfectly valid campaign brief.",
      budget: 500
    })
  });
  result = await res.json();
  console.log(`Status: ${res.status} (Expected 201) | Success: ${result.success || 'Failed'}`);
  console.log("🎉 ZOD VALIDATION TEST FINISHED!");
}
testValidation();
