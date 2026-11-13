const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testVectorDimension() {
  console.log("🚀 Testing Vector Dimension Constraint...\n");

  // دریافت یک پروفایل موجود برای آپدیت
  const { data: creator } = await supabase.from('creators').select('id, username').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found");

  // ساخت یک بردار اشتباه با ۷۰۰ بعد (باید ۷۶۸ باشد)
  const wrongVector = Array(700).fill(0.1);

  console.log("Test: Trying to save a 700-dimension vector into vector(768) column...");
  const { error } = await supabase
    .from('creators')
    .update({ ai_embedding: wrongVector })
    .eq('id', creator.id);

  if (error) {
    console.log(`✅ BLOCKED by Database! Error: ${error.message}`);
    console.log("🎉 VECTOR CONSTRAINT WORKS!");
  } else {
    console.log(`❌ WARNING: Wrong vector was saved! Constraint is not active.`);
  }
}
testVectorDimension();
