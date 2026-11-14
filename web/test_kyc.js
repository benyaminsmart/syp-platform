const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
const supabaseAdmin = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testKYC() {
  console.log("🚀 Testing KYC/AML System...\n");

  // 1. ساخت کاربر برند
  const brandEmail = `brand_${Date.now()}@test.com`;
  const { data: authData } = await supabaseAdmin.auth.admin.createUser({
    email: brandEmail, password: 'Pass123!', email_confirm: true,
  });
  const { data: signInData } = await supabase.auth.signInWithPassword({ email: brandEmail, password: 'Pass123!' });
  const brandToken = signInData.session.access_token;
  console.log(`✅ Brand user created: ${brandEmail}\n`);

  // 2. تلاش برای تراکنش کوچک (زیر حد مجاز)
  console.log("Test 1: Transaction of 5,000 AED (Should be allowed without KYC)");
  let res = await fetch("http://localhost:3000/api/kyc/check-limit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${brandToken}` },
    body: JSON.stringify({ amount: 5000 })
  });
  let data = await res.json();
  console.log(`   Status: ${res.status} | KYC Required: ${data.kyc_required}\n`);

  // 3. تلاش برای تراکنش بزرگ (بالای حد مجاز) - نباید مجاز باشد
  console.log("Test 2: Transaction of 15,000 AED (Should be BLOCKED - KYC required)");
  res = await fetch("http://localhost:3000/api/kyc/check-limit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${brandToken}` },
    body: JSON.stringify({ amount: 15000 })
  });
  data = await res.json();
  console.log(`   Status: ${res.status} | KYC Required: ${data.kyc_required} | Error: ${data.error}\n`);

  // 4. ثبت KYC
  console.log("Test 3: Submitting KYC request...");
  res = await fetch("http://localhost:3000/api/kyc/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${brandToken}` },
    body: JSON.stringify({
      full_name: "John Doe",
      document_type: "passport",
      document_url: "https://example.com/passport.jpg"
    })
  });
  data = await res.json();
  console.log(`   Status: ${res.status} | ${data.success ? 'SUCCESS' : 'Error: ' + data.error}\n`);

  if (!data.kyc) return;

  // 5. تایید KYC توسط ادمین (شبیه‌سازی)
  console.log("Test 4: Admin approving KYC...");
  await supabaseAdmin.from('kyc_verifications').update({ status: 'approved' }).eq('id', data.kyc.id);
  
  // 6. تلاش مجدد برای تراکنش بزرگ (باید مجاز باشد)
  console.log("Test 5: Retrying 15,000 AED transaction (Should be ALLOWED now)");
  res = await fetch("http://localhost:3000/api/kyc/check-limit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${brandToken}` },
    body: JSON.stringify({ amount: 15000 })
  });
  data = await res.json();
  console.log(`   Status: ${res.status} | KYC Required: ${data.kyc_required}\n`);

  if (data.kyc_required === false && data.message.includes("KYC verified")) {
    console.log("🎉 KYC/AML SYSTEM WORKS!");
  }
}
testKYC();
