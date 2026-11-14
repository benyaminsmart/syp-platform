const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function seed() {
  console.log("🌱 Seeding 5 test creators...");
  const creators = [
    { username: 'creator_1', display_name: 'Creator One', followers: 10000 },
    { username: 'creator_2', display_name: 'Creator Two', followers: 20000 },
    { username: 'creator_3', display_name: 'Creator Three', followers: 30000 },
    { username: 'creator_4', display_name: 'Creator Four', followers: 50000 },
    { username: 'creator_5', display_name: 'Creator Five', followers: 80000 },
  ];

  for (const c of creators) {
    await supabase.from('creators').upsert({
      platform: 'instagram',
      username: c.username,
      display_name: c.display_name,
      profile_url: `https://instagram.com/${c.username}`,
      bio_ai: `This is a test profile for ${c.display_name}.`,
      category: 'Tech & AI',
      followers_count: c.followers,
      status: 'unclaimed'
    }, { onConflict: 'platform,username' });
  }
  console.log("✅ Seeding complete.");
}
seed();
