const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testImageUpload() {
  console.log("🚀 Testing Image Upload (Base64 mode)...\n");

  const adminEmail = `admin_${Date.now()}@test.com`;
  await supabase.auth.admin.createUser({ email: adminEmail, password: 'Pass123!', email_confirm: true });
  const { data: signInData } = await supabase.auth.signInWithPassword({ email: adminEmail, password: 'Pass123!' });
  const token = signInData.session.access_token;

  const { data: creator } = await supabase.from('creators').select('id, username').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found");

  console.log(`✅ Testing on creator: @${creator.username}\n`);

  // استفاده از یک تصویر Base64 ساده (۱x۱ پیکسل)
  const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  
  console.log("1. Sending Base64 image to API...");
  const res = await fetch("http://localhost:3000/api/upload/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ creator_id: creator.id, image_base64: base64Image })
  });
  
  const data = await res.json();
  console.log(`   Status: ${res.status} | Success: ${data.success || 'Failed'}`);
  if (data.avatar_url) console.log(`   New Avatar URL: ${data.avatar_url}\n`);

  // بررسی دیتابیس
  console.log("2. Verifying avatar_url in database...");
  const { data: updatedCreator } = await supabase.from('creators').select('avatar_url').eq('id', creator.id).single();
  
  if (updatedCreator && updatedCreator.avatar_url) {
    console.log(`✅ Avatar URL saved: ${updatedCreator.avatar_url}`);
    console.log("\n🎉 IMAGE UPLOAD WORKS!");
  } else {
    console.log("❌ Avatar URL not saved.");
  }
}
testImageUpload();
