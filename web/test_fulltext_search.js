const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testFullTextSearch() {
  console.log("🚀 Testing Full-Text Search...\n");

  const testUsername = 'ft_test_' + Date.now();

  // 1. ساخت ۳ پروفایل با کلمات کلیدی مختلف
  console.log("1. Creating 3 test profiles...");
  const profiles = [
    { platform: 'instagram', username: testUsername + '_1', display_name: 'Tech Guy', bio_ai: 'Expert in artificial intelligence and machine learning.', category: 'Tech & AI', followers_count: 1000, profile_url: 'https://instagram.com/test1', status: 'unclaimed' },
    { platform: 'instagram', username: testUsername + '_2', display_name: 'Food Lover', bio_ai: 'Reviewing the best restaurants in Dubai.', category: 'Food & Dining', followers_count: 2000, profile_url: 'https://instagram.com/test2', status: 'unclaimed' },
    { platform: 'youtube', username: testUsername + '_3', display_name: 'Tech Reviewer', bio_ai: 'Unboxing the latest smartphones and gadgets.', category: 'Tech & AI', followers_count: 3000, profile_url: 'https://youtube.com/@test3', status: 'unclaimed' },
  ];

  for (const p of profiles) {
    await supabase.from('creators').insert(p);
  }
  console.log("✅ Profiles created.\n");

  // ۲. تست جستجو برای کلمه "Tech"
  console.log("2. Searching for 'Tech' (Should find 2 profiles)...");
  let res = await fetch(`http://localhost:3000/api/creators?search=Tech`);
  let data = await res.json();
  
  if (data.success) {
    const found = data.creators.filter(c => c.username.startsWith(testUsername));
    console.log(`✅ Found ${found.length} matching profiles (out of ${data.creators.length} total results).`);
    found.forEach(c => console.log(`   - ${c.display_name} (${c.username})`));
  }
  console.log();

  // ۳. تست جستجو برای کلمه "Dubai" (فقط در bio_ai)
  console.log("3. Searching for 'Dubai' in bio (Should find 1 profile)...");
  res = await fetch(`http://localhost:3000/api/creators?search=Dubai`);
  data = await res.json();
  
  if (data.success) {
    const found = data.creators.filter(c => c.username.startsWith(testUsername));
    console.log(`✅ Found ${found.length} matching profiles.`);
    found.forEach(c => console.log(`   - ${c.display_name} (${c.username})`));
  }

  // ۴. پاکسازی
  console.log("\n🧹 Cleaning up test data...");
  await supabase.from('creators').delete().like('username', `${testUsername}%`);
  console.log("✅ Cleanup complete.");
}
testFullTextSearch();
