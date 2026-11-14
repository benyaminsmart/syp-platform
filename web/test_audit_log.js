const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseAdmin = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testAuditLog() {
  console.log("🚀 Testing Legal Audit Log...\n");

  // 1. ساخت کاربر ادمین
  const adminEmail = `admin_${Date.now()}@test.com`;
  const { data: authData } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail, password: 'Pass123!', email_confirm: true,
  });
  await supabaseAdmin.rpc('promote_to_admin', { user_id: authData.user.id });
  const { data: signInData } = await supabaseAdmin.auth.signInWithPassword({ email: adminEmail, password: 'Pass123!' });
  const adminToken = signInData.session.access_token;
  const adminId = authData.user.id;
  console.log(`✅ Admin created: ${adminId}\n`);

  // 2. ساخت پروفایل با تابع امن
  const testUsername = `audit_test_${Date.now()}`;
  const { data: creatorId, error: creatorError } = await supabaseAdmin.rpc('insert_creator_safe', {
    p_platform: 'instagram', p_username: testUsername, p_display_name: 'Audit Test Creator',
    p_profile_url: `https://instagram.com/${testUsername}`, p_bio_ai: 'Test bio',
    p_category: 'Tech & AI', p_followers_count: 1000, p_status: 'unclaimed',
    p_country_code: 'AE', p_shard_key: 'AE_instagram',
  });

  if (creatorError) return console.log("❌ Creator Error:", creatorError.message);
  console.log(`✅ Creator created: ${creatorId}\n`);

  // 3. ساخت Claim با تابع امن
  const { data: claimId, error: claimError } = await supabaseAdmin.rpc('insert_test_claim', {
    p_creator_id: creatorId, p_user_id: adminId, p_verification_code: 'SYP-TEST-' + crypto.randomUUID(),
  });

  if (claimError) return console.log("❌ Claim Error:", claimError.message);
  console.log(`✅ Claim created: ${claimId}\n`);

  // 4. فراخوانی API ادمین
  console.log("1. Admin approving claim...");
  const res = await fetch("http://localhost:3000/api/admin/approve-claim", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
    body: JSON.stringify({ claim_request_id: claimId })
  });
  const data = await res.json();
  console.log(`   Status: ${res.status} | ${data.success ? 'SUCCESS' : 'Error: ' + data.error}\n`);

  // 5. صبر کوتاه
  await new Promise(r => setTimeout(r, 1000));

  // 6. خواندن آخرین لاگ‌ها (بدون فیلتر target_id)
  console.log("2. Fetching last 5 audit logs from DB...");
  const { data: logs } = await supabaseAdmin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!logs || logs.length === 0) {
    return console.log("❌ No audit logs found in DB.");
  }

  // 7. پیدا کردن لاگی که به adminId ما مربوط است
  const ourLog = logs.find(log => log.admin_id === adminId);

  if (ourLog) {
    console.log(`✅ Found our log:`);
    console.log(`   Admin ID: ${ourLog.admin_id}`);
    console.log(`   Target: ${ourLog.target_table}/${ourLog.target_id}`);
    console.log(`   IP: ${ourLog.ip_address}`);
    console.log(`   Changes: ${JSON.stringify(ourLog.old_data)} -> ${JSON.stringify(ourLog.new_data)}`);
    console.log("\n🎉 AUDIT LOG SYSTEM WORKS!");
  } else {
    console.log(`❌ Our log not found. Last 5 logs admin_ids:`);
    logs.forEach(log => console.log(`   - ${log.admin_id}`));
  }
}
testAuditLog();
