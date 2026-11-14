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

async function testEmailQueue() {
  console.log("🚀 Testing Email Queue System...\n");

  // 1. ساخت کاربر با تایید خودکار
  const adminEmail = `admin_${Date.now()}@test.com`;
  console.log("1. Creating confirmed admin user...");
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: 'Pass123!',
    email_confirm: true, // تایید خودکار
  });

  if (authErr) return console.log("❌ Auth Error:", authErr.message);
  console.log(`✅ User created: ${authData.user.id}\n`);

  // 2. لاگین و بررسی توکن
  console.log("2. Signing in to get token...");
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: 'Pass123!',
  });

  if (signInErr) return console.log("❌ SignIn Error:", signInErr.message);
  
  const token = signInData.session.access_token;
  console.log(`✅ Token received (length: ${token.length})\n`);

  // 3. تست API با توکن
  console.log("3. Testing API with token...");
  const uniqueEmail = `queue_test_${crypto.randomUUID()}@example.com`;
  
  const addRes = await fetch("http://localhost:3000/api/queue/email", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${token}` 
    },
    body: JSON.stringify({ to: uniqueEmail, subject: "Hello", html: "<h1>Test</h1>" })
  });

  const addData = await addRes.json();
  console.log(`   Status: ${addRes.status} | Response: ${JSON.stringify(addData)}\n`);

  if (addRes.status === 201) {
    console.log("🎉 EMAIL QUEUE WORKS! Record inserted.");
  }
}
testEmailQueue();
