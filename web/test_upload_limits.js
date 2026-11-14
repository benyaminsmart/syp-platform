const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
const supabaseAdmin = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testUploadLimits() {
  console.log("🚀 Testing Upload Limits...\n");

  // ۱. ساخت کاربر
  const userEmail = `user_${Date.now()}@test.com`;
  const { data: authData } = await supabaseAdmin.auth.admin.createUser({
    email: userEmail, password: 'Pass123!', email_confirm: true,
  });
  const { data: signInData } = await supabase.auth.signInWithPassword({ email: userEmail, password: 'Pass123!' });
  const userToken = signInData.session.access_token;

  const { data: creator } = await supabaseAdmin.from('creators').select('id').is('deleted_at', null).limit(1).single();
  if (!creator) return console.log("❌ No creator found");

  // ۲. تست ۱: تصویر کوچک (باید موفق شود)
  console.log("Test 1: Small image (500KB) - Should SUCCEED");
  const smallImage = "data:image/png;base64," + "A".repeat(500 * 1024);
  let res = await fetch("http://localhost:3000/api/upload/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
    body: JSON.stringify({ creator_id: creator.id, image_base64: smallImage })
  });
  let data = await res.json();
  console.log(`   Status: ${res.status} | ${data.success ? 'SUCCESS' : 'Error: ' + data.error}\n`);

  // ۳. تست ۲: تصویر بزرگ (باید رد شود)
  console.log("Test 2: Large image (5MB) - Should be REJECTED (413)");
  const largeImage = "data:image/png;base64," + "A".repeat(5 * 1024 * 1024);
  res = await fetch("http://localhost:3000/api/upload/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
    body: JSON.stringify({ creator_id: creator.id, image_base64: largeImage })
  });
  data = await res.json();
  console.log(`   Status: ${res.status} (Expected: 413) | Error: ${data.error}\n`);

  if (res.status === 413) {
    console.log("🎉 UPLOAD LIMITS WORK!");
  }
}
testUploadLimits();
