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

async function testRefund() {
  console.log("🚀 Testing Refund System...\n");

  // 1. ساخت کاربر ادمین
  const adminEmail = `admin_${Date.now()}@test.com`;
  const { data: authData } = await supabase.auth.admin.createUser({
    email: adminEmail, password: 'Pass123!', email_confirm: true,
  });
  await supabase.rpc('promote_to_admin', { user_id: authData.user.id });
  const { data: signInData } = await supabase.auth.signInWithPassword({ email: adminEmail, password: 'Pass123!' });
  const adminToken = signInData.session.access_token;

  // 2. پیدا کردن کریتور
  const { data: creators } = await supabase.from('creators').select('id, username').is('deleted_at', null).limit(1);
  if (!creators || creators.length === 0) return console.log("❌ No active creators found.");
  const creator = creators[0];
  console.log(`✅ Using creator: @${creator.username}\n`);

  // 3. ساخت رزرو
  console.log("1. Creating test booking...");
  const { data: booking, error: bookingError } = await supabase.from('bookings').insert({
    creator_id: creator.id,
    brand_email: "brand@test.com",
    brand_name: "Test Brand",
    campaign_brief: "Test campaign for refund",
    budget: 1000,
    amount_usd: 1000,
    platform_fee_usd: 100,
    status: "in_escrow",
    idempotency_key: crypto.randomUUID(),
  }).select().single();

  if (bookingError) return console.log("❌ Failed to create booking:", bookingError.message);
  console.log(`✅ Booking created (ID: ${booking.id})\n`);

  // 4. درخواست استرداد
  console.log("2. Requesting refund...");
  const reqRes = await fetch("http://localhost:3000/api/refunds/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
    body: JSON.stringify({ booking_id: booking.id, reason: "Creator did not deliver content." })
  });
  const reqData = await reqRes.json();
  console.log(`   Status: ${reqRes.status} | ${reqData.success ? 'SUCCESS' : 'Error: ' + reqData.error}\n`);
  if (!reqData.refund) return;

  // 5. تایید استرداد
  console.log("3. Admin approving refund...");
  const approveRes = await fetch("http://localhost:3000/api/admin/process-refund", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
    body: JSON.stringify({ refund_id: reqData.refund.id, action: "approve", admin_notes: "Verified." })
  });
  const approveData = await approveRes.json();
  console.log(`   Status: ${approveRes.status} | ${approveData.success ? 'SUCCESS' : 'Error: ' + approveData.error}\n`);

  // 6. تاخیر کوچک برای همگام‌سازی دیتابیس
  console.log("4. Waiting 500ms for DB sync...");
  await new Promise(r => setTimeout(r, 500));

  // 7. بررسی نهایی با service_role
  const { data: finalRefund, error: refundErr } = await supabase.from('refund_requests').select('status').eq('id', reqData.refund.id).single();
  const { data: finalBooking, error: bookingErr } = await supabase.from('bookings').select('status').eq('id', booking.id).single();
  
  if (!finalRefund) return console.log(`❌ Refund not found. Error: ${refundErr?.message}`);
  if (!finalBooking) return console.log(`❌ Booking not found. Error: ${bookingErr?.message}`);

  console.log(`📊 Final Refund Status: ${finalRefund.status}`);
  console.log(`📊 Final Booking Status: ${finalBooking.status}`);

  if (finalRefund.status === 'processed' && finalBooking.status === 'cancelled') {
    console.log("\n🎉 REFUND SYSTEM WORKS!");
  } else {
    console.log("\n⚠️ Something is wrong with the status update.");
  }
}
testRefund();
