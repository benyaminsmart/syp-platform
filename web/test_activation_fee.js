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

async function testActivationFee() {
  console.log("🚀 Testing Activation Fee System...\n");

  // 1. ساخت کاربر کریتور
  const creatorEmail = `creator_${Date.now()}@test.com`;
  const { data: authData } = await supabaseAdmin.auth.admin.createUser({
    email: creatorEmail, password: 'Pass123!', email_confirm: true,
  });
  const { data: signInData } = await supabase.auth.signInWithPassword({ email: creatorEmail, password: 'Pass123!' });
  const creatorToken = signInData.session.access_token;
  console.log(`✅ Creator user created: ${creatorEmail}\n`);

  // 2. پیدا کردن یک کریتور برای تست
  const { data: creator } = await supabaseAdmin.from('creators').select('id, username').is('deleted_at', null).limit(1).single();
  if (!creator) return console.log("❌ No creator found");

  // 3. پرداخت هزینه فعال‌سازی
  console.log("1. Paying activation fee (500 AED)...");
  let res = await fetch("http://localhost:3000/api/activation/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${creatorToken}` },
    body: JSON.stringify({ creator_id: creator.id, payment_method: "credit_card" })
  });
  let data = await res.json();
  console.log(`   Status: ${res.status} | ${data.success ? 'SUCCESS' : 'Error: ' + data.error}`);
  if (data.activation) {
    console.log(`   Amount: ${data.activation.amount} ${data.activation.currency}`);
    console.log(`   Status: ${data.activation.status}\n`);
  }

  // 4. تلاش مجدد (باید رد شود چون قبلاً پرداخت شده)
  console.log("2. Retrying payment (Should be REJECTED)...");
  res = await fetch("http://localhost:3000/api/activation/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${creatorToken}` },
    body: JSON.stringify({ creator_id: creator.id })
  });
  data = await res.json();
  console.log(`   Status: ${res.status} | Error: ${data.error}\n`);

  if (res.status === 409) {
    console.log("🎉 ACTIVATION FEE SYSTEM WORKS!");
  }
}
testActivationFee();
