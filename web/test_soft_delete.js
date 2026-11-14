const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testSoftDelete() {
  console.log("🚀 Testing Soft Delete...\n");

  // 1. پیدا کردن هر پروفایلی که حذف نشده باشد
  const { data: creators } = await supabase
    .from('creators')
    .select('id, username')
    .is('deleted_at', null)
    .limit(1);

  if (!creators || creators.length === 0) {
    return console.log("❌ No active creators found in DB. Please run seed_test_users.js first.");
  }
  
  const creator = creators[0];
  console.log(`✅ Selected creator for test: @${creator.username} (ID: ${creator.id})\n`);

  // 2. ساخت کاربر عادی و ادمین
  const normalUser = await supabase.auth.admin.createUser({ email: `normal_${Date.now()}@test.com`, password: 'Pass123!', email_confirm: true });
  const adminUser = await supabase.auth.admin.createUser({ email: `admin_${Date.now()}@test.com`, password: 'Pass123!', email_confirm: true });
  
  // ارتقای کاربر دوم به ادمین
  await supabase.rpc('promote_to_admin', { user_id: adminUser.data.user.id });

  // لاگین برای گرفتن توکن
  const normalSignIn = await supabase.auth.signInWithPassword({ email: normalUser.data.user.email, password: 'Pass123!' });
  const adminSignIn = await supabase.auth.signInWithPassword({ email: adminUser.data.user.email, password: 'Pass123!' });

  const normalToken = normalSignIn.data.session.access_token;
  const adminToken = adminSignIn.data.session.access_token;

  // 3. تست ۱: کاربر عادی تلاش می‌کند پروفایل را حذف کند (باید 403 بگیرد)
  console.log("Test 1: Normal user tries to delete (Expected: 403)");
  let res = await fetch("http://localhost:3000/api/creators/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${normalToken}` },
    body: JSON.stringify({ creator_id: creator.id })
  });
  let data = await res.json();
  console.log(`Status: ${res.status} | Error: ${data.error}\n`);

  // 4. تست ۲: ادمین پروفایل را حذف می‌کند (باید 200 بگیرد)
  console.log("Test 2: Admin deletes profile (Expected: 200)");
  res = await fetch("http://localhost:3000/api/creators/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
    body: JSON.stringify({ creator_id: creator.id })
  });
  data = await res.json();
  console.log(`Status: ${res.status} | Success: ${data.success}\n`);

  // 5. تست ۳: بررسی اینکه پروفایل از لیست حذف شده است
  console.log("Test 3: Verify profile is hidden from list API");
  res = await fetch("http://localhost:3000/api/creators?limit=100");
  data = await res.json();
  const isHidden = !data.creators.some(c => c.id === creator.id);
  
  if (isHidden) {
    console.log("✅ Profile is hidden from the list!");
    console.log("🎉 SOFT DELETE WORKS!");
  } else {
    console.log("❌ Profile is still visible in the list.");
  }
}
testSoftDelete();
