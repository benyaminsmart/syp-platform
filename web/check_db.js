const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function check() {
  const { data, error } = await supabase.from('creators').select('username, display_name, status');
  if (error) {
    console.log("❌ Database Error:", error.message);
  } else if (data.length === 0) {
    console.log("⚠️ Database is EMPTY. No creators found.");
  } else {
    console.log("✅ Creators in DB:", data);
  }
}
check();
