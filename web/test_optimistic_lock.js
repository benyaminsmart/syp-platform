const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testOptimisticLocking() {
  console.log("🚀 Testing Optimistic Locking (Concurrent Updates)...\n");

  // 1. ساخت کاربر عادی
  const adminEmail = `admin_${Date.now()}@syp.com`;
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: 'AdminPass123!',
    email_confirm: true,
  });

  if (authErr) return console.log("❌ Failed to create user:", authErr.message);
  const adminId = authData.user.id;
  console.log(`✅ Admin user created: ${adminId}`);

  // 2. ارتقا کاربر به ادمین
  const { error: rpcErr } = await supabase.rpc('promote_to_admin', { user_id: adminId });
  if (rpcErr) return console.log("❌ Failed to promote to admin:", rpcErr.message);
  console.log(`✅ User promoted to admin`);

  // 3. لاگین برای گرفتن توکن
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: 'AdminPass123!',
  });
  const adminToken = signInData.session.access_token;
  console.log(`✅ Logged in and got token\n`);

  // 4. پیدا کردن کریتور
  const { data: creator } = await supabase.from('creators').select('id, version').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found");

  // 5. پاک کردن Claimهای قبلی
  await supabase.from('claim_requests').delete().eq('creator_id', creator.id);

  // 6. ساخت Claim جدید (از طریق API امن خودمان)
  const csrfRes = await fetch("http://localhost:3000/api/csrf");
  const { csrfToken } = await csrfRes.json();

  const claimRes = await fetch("http://localhost:3000/api/claim", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken
    },
    body: JSON.stringify({
      creator_id: creator.id,
      user_id: adminId,
      verification_code: 'SYP-TEST-' + Date.now(),
    })
  });

  if (!claimRes.ok) {
    const error = await claimRes.json();
    return console.log("❌ Failed to create claim:", error.error);
  }

  const claim = await claimRes.json();
  console.log(`✅ Test claim created: ${claim.claim.id}`);
  console.log(`📌 Profile version BEFORE: ${creator.version}\n`);

  console.log("Test: Two admins trying to approve the SAME claim concurrently...\n");

  const makeRequest = async (adminName) => {
    const res = await fetch("http://localhost:3000/api/admin/approve-claim", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}` 
      },
      body: JSON.stringify({ claim_request_id: claim.claim.id })
    });
    const data = await res.json();
    console.log(`  ${adminName} -> Status: ${res.status} | ${data.success ? 'SUCCESS' : 'Error: ' + data.error}`);
    return res.status;
  };

  await Promise.all([
    makeRequest("Admin A"),
    makeRequest("Admin B"),
  ]);

  const { data: finalCreator } = await supabase.from('creators').select('version').eq('id', creator.id).single();
  console.log(`\n📌 Profile version AFTER: ${finalCreator.version}`);
  console.log(`📈 Version increase: ${finalCreator.version - creator.version}\n`);

  if (finalCreator.version - creator.version === 1) {
    console.log("🎉 OPTIMISTIC LOCKING WORKS! Only one update succeeded.");
  } else {
    console.log("⚠️ WARNING: Both updates were applied. Optimistic Lock failed.");
  }
}
testOptimisticLocking();
