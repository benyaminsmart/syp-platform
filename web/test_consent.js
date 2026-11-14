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

async function testConsent() {
  console.log("🚀 Testing ToS/Privacy Consent System...\n");

  // 1. ساخت کاربر جدید
  const userEmail = `user_${Date.now()}@test.com`;
  await supabaseAdmin.auth.admin.createUser({ email: userEmail, password: 'Pass123!', email_confirm: true });
  const { data: signInData } = await supabase.auth.signInWithPassword({ email: userEmail, password: 'Pass123!' });
  const userToken = signInData.session.access_token;
  console.log(`✅ User created: ${userEmail}\n`);

  // 2. بررسی وضعیت اولیه (نباید رضایت‌نامه داشته باشد)
  console.log("Test 1: Checking initial consent status (Should be FALSE)");
  let res = await fetch("http://localhost:3000/api/consent", {
    headers: { "Authorization": `Bearer ${userToken}` }
  });
  let data = await res.json();
  console.log(`   Status: ${res.status} | Has Consented: ${data.has_consented}\n`);

  // 3. ثبت رضایت‌نامه
  console.log("Test 2: Accepting ToS and Privacy Policy...");
  res = await fetch("http://localhost:3000/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
    body: JSON.stringify({})
  });
  data = await res.json();
  console.log(`   Status: ${res.status} | ${data.success ? 'SUCCESS' : 'Error: ' + data.error}\n`);

  // 4. بررسی مجدد وضعیت (باید رضایت‌نامه داشته باشد)
  console.log("Test 3: Checking consent status again (Should be TRUE)");
  res = await fetch("http://localhost:3000/api/consent", {
    headers: { "Authorization": `Bearer ${userToken}` }
  });
  data = await res.json();
  console.log(`   Status: ${res.status} | Has Consented: ${data.has_consented}\n`);

  // 5. بررسی لاگ حقوقی در دیتابیس
  console.log("Test 4: Verifying legal log in database...");
  const { data: consents } = await supabaseAdmin
    .from('user_consents')
    .select('*')
    .eq('user_email', userEmail);
  
  if (consents && consents.length > 0) {
    console.log(`✅ Legal log found: IP: ${consents[0].ip_address}, ToS v${consents[0].tos_version}`);
    console.log("\n🎉 CONSENT SYSTEM WORKS!");
  }
}
testConsent();
