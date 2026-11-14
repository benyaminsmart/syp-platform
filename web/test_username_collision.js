const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testCollision() {
  console.log("🚀 Testing Username Collision (Same Username, Different Platforms)...\n");

  const testUsername = 'collision_test_' + Date.now();

  // 1. ساخت پروفایل اینستاگرام
  console.log("1. Creating Instagram profile...");
  const { error: instaError } = await supabase.from('creators').insert({
    platform: 'instagram', username: testUsername, display_name: 'Instagram Version',
    profile_url: `https://instagram.com/${testUsername}`, bio_ai: 'Instagram bio', category: 'Tech & AI',
    followers_count: 10000, status: 'unclaimed'
  });
  if (instaError) return console.log("❌ Instagram failed:", instaError.message);
  console.log("✅ Instagram profile created.\n");

  // 2. ساخت پروفایل یوتوب با همان نام کاربری
  console.log("2. Creating YouTube profile with SAME username...");
  const { error: ytError } = await supabase.from('creators').insert({
    platform: 'youtube', username: testUsername, display_name: 'YouTube Version',
    profile_url: `https://youtube.com/@${testUsername}`, bio_ai: 'YouTube bio', category: 'Tech & AI',
    followers_count: 20000, status: 'unclaimed'
  });
  if (ytError) return console.log("❌ YouTube failed:", ytError.message);
  console.log("✅ YouTube profile created.\n");

  // 3. بررسی اینکه هر دو در دیتابیس وجود دارند
  console.log("3. Verifying both profiles exist independently...");
  const { data: both } = await supabase.from('creators').select('platform, username, display_name').eq('username', testUsername);
  
  if (both && both.length === 2) {
    console.log(`✅ Found ${both.length} profiles:`);
    both.forEach(p => console.log(`   - ${p.platform}: ${p.display_name}`));
    console.log("\n🎉 USERNAME COLLISION WORKS! Same username can exist on different platforms.");
  } else {
    console.log(`❌ Expected 2 profiles, found ${both?.length || 0}.`);
  }

  // 4. پاکسازی
  await supabase.from('creators').delete().eq('username', testUsername);
  console.log("\n🧹 Test data cleaned up.");
}
testCollision();
