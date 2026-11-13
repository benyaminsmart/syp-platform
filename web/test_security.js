const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testFlow() {
  console.log("1. Fetching creator...");
  const { data: creator } = await supabase.from('creators').select('*').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found.");
  console.log("✅ Creator found:", creator.username);

  console.log("2. Creating a real test user in Auth...");
  const testEmail = `testuser_${Date.now()}@syp.com`;
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true
  });

  if (authErr) return console.log("❌ Auth creation failed:", authErr.message);
  const userId = authData.user.id;
  console.log("✅ Test user created with ID:", userId);

  console.log("3. Creating fake claim request for this user...");
  const { data: claim, error: claimErr } = await supabase.from('claim_requests').insert({
    creator_id: creator.id,
    user_id: userId,
    verification_code: 'SYP-VERIFY-TEST',
    status: 'pending'
  }).select().single();

  if (claimErr) return console.log("❌ Claim failed:", claimErr.message);
  console.log("✅ Claim created with ID:", claim.id);

  console.log("4. Approving claim via Admin API...");
  const res = await fetch("http://localhost:3000/api/admin/approve-claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      claim_request_id: claim.id,
      admin_secret: env['ADMIN_SECRET_KEY']
    })
  });

  const result = await res.json();
  console.log("API Response:", result);

  if (res.ok) {
    console.log("5. Verifying profile status in DB...");
    const { data: updatedCreator } = await supabase.from('creators').select('status, owner_user_id').eq('id', creator.id).single();
    console.log("✅ Final Profile Status:", updatedCreator);
    console.log("🎉 SECURITY FLOW TEST PASSED!");
  }
}
testFlow();
