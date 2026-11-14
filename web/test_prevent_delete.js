const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testPreventDelete() {
  console.log("🚀 Testing Protection Against Deleting Profiles with Active Bookings...\n");

  // 1. پیدا کردن کریتور تست
  const { data: creator } = await supabase.from('creators').select('id, username').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found");

  // 2. ساخت یک رزرو فعال برای این کریتور
  console.log("1. Creating an active booking for this creator...");
  const { data: booking } = await supabase.from('bookings').insert({
    creator_id: creator.id,
    brand_email: "active@test.com",
    brand_name: "Active Test Brand",
    campaign_brief: "Testing active booking protection.",
    budget: 1000,
    amount_usd: 1000,
    platform_fee_usd: 100,
    status: "pending_payment"
  }).select().single();
  
  console.log(`✅ Active booking created (ID: ${booking.id})\n`);

  // 3. تلاش برای Soft Delete پروفایل (باید توسط تریگر بلاک شود)
  console.log("2. Attempting to soft-delete the creator (Should be BLOCKED by DB trigger)...");
  const { error } = await supabase
    .from('creators')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', creator.id);

  if (error) {
    console.log(`✅ DB BLOCKED THE DELETE! Error: ${error.message}`);
    console.log("🎉 TRIGGER WORKS! Profiles with active bookings cannot be deleted.");
  } else {
    console.log("❌ WARNING: Delete was allowed! Trigger failed.");
  }

  // 4. پاکسازی (حذف رزرو و برگرداندن وضعیت پروفایل)
  console.log("\n🧹 Cleaning up test data...");
  await supabase.from('bookings').delete().eq('id', booking.id);
  await supabase.from('creators').update({ deleted_at: null }).eq('id', creator.id);
  console.log("✅ Cleanup complete.");
}
testPreventDelete();
