const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testAdvisoryLock() {
  console.log("🚀 Testing Advisory Lock (Concurrent Claims)...\n");

  const { data: creator } = await supabase.from('creators').select('id').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found");

  await supabase.from('claim_requests').delete().eq('creator_id', creator.id);

  const csrfRes = await fetch("http://localhost:3000/api/csrf");
  const { csrfToken } = await csrfRes.json();

  const user1 = await supabase.auth.admin.createUser({ email: `u1_${Date.now()}@test.com`, password: 'Pass123!', email_confirm: true });
  const user2 = await supabase.auth.admin.createUser({ email: `u2_${Date.now()}@test.com`, password: 'Pass123!', email_confirm: true });

  const makeClaim = async (userId, name) => {
    // کد تأیید کوتاه و معتبر (مطابق با Zod)
    const code = 'SYP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    
    const res = await fetch("http://localhost:3000/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ 
        creator_id: creator.id, 
        user_id: userId, 
        verification_code: code 
      })
    });
    const data = await res.json();
    console.log(`  ${name} -> Status: ${res.status} | ${data.success ? 'SUCCESS' : 'Error: ' + data.error}`);
    return res.status;
  };

  await Promise.all([
    makeClaim(user1.data.user.id, "Claim A"),
    makeClaim(user2.data.user.id, "Claim B"),
  ]);

  const { data: finalClaims } = await supabase.from('claim_requests').select('id').eq('creator_id', creator.id).eq('status', 'pending');
  console.log(`\n📊 Total pending claims in DB: ${finalClaims.length} (Should be 1)`);

  if (finalClaims.length === 1) {
    console.log("🎉 ADVISORY LOCK WORKS! Only one claim was registered.");
  } else {
    console.log("⚠️ WARNING: Multiple claims were registered. Lock failed.");
  }
}
testAdvisoryLock();
