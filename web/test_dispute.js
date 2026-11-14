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

async function testDispute() {
  console.log("🚀 Testing Dispute System...\n");

  // 1. ساخت کاربر ادمین
  const adminEmail = `admin_${Date.now()}@test.com`;
  const { data: authData } = await supabase.auth.admin.createUser({
    email: adminEmail, password: 'Pass123!', email_confirm: true,
  });
  await supabase.rpc('promote_to_admin', { user_id: authData.user.id });
  const { data: signInData } = await supabase.auth.signInWithPassword({ email: adminEmail, password: 'Pass123!' });
  const adminToken = signInData.session.access_token;
  const adminUserId = authData.user.id;

  // 2. پیدا کردن کریتور
  const { data: creators } = await supabase.from('creators').select('id, username').is('deleted_at', null).limit(1);
  if (!creators || creators.length === 0) return console.log("❌ No active creators found.");
  const creator = creators[0];

  // 3. ساخت رزرو با brand_id پر شده
  console.log("0. Creating test booking with valid brand_id...");
  const { data: booking, error: bookingError } = await supabase.from('bookings').insert({
    creator_id: creator.id,
    brand_id: adminUserId, // 👈 پر کردن brand_id با UUID کاربر
    brand_email: "brand@test.com",
    brand_name: "Test Brand",
    campaign_brief: "Test campaign for dispute",
    budget: 1000,
    amount_usd: 1000,
    platform_fee_usd: 100,
    status: "in_escrow",
    idempotency_key: crypto.randomUUID(),
  }).select().single();

  if (bookingError) return console.log("❌ Failed to create booking:", bookingError.message);
  console.log(`✅ Booking created (ID: ${booking.id})\n`);

  // 4. ثبت اختلاف
  console.log("1. Opening dispute...");
  const disputeRes = await fetch("http://localhost:3000/api/disputes/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
    body: JSON.stringify({ 
      booking_id: booking.id, 
      opened_by: "brand", 
      reason: "Creator did not deliver content as promised.",
      evidence_url: "https://example.com/screenshot.png"
    })
  });
  const disputeData = await disputeRes.json();
  console.log(`   Status: ${disputeRes.status} | ${disputeData.success ? 'SUCCESS' : 'Error: ' + disputeData.error}\n`);
  if (!disputeData.dispute) return;

  // 5. داوری
  console.log("2. Admin resolving dispute...");
  const resolveRes = await fetch("http://localhost:3000/api/admin/resolve-dispute", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
    body: JSON.stringify({ 
      dispute_id: disputeData.dispute.id, 
      decision: "resolved_brand", 
      admin_notes: "Creator failed to deliver. Refund approved." 
    })
  });
  const resolveData = await resolveRes.json();
  console.log(`   Status: ${resolveRes.status} | ${resolveData.success ? 'SUCCESS' : 'Error: ' + resolveData.error}\n`);

  // 6. بررسی نهایی
  await new Promise(r => setTimeout(r, 500));
  const { data: finalDispute } = await supabase.from('disputes').select('status').eq('id', disputeData.dispute.id).single();
  console.log(`📊 Final Dispute Status: ${finalDispute.status}`);

  if (finalDispute.status === 'resolved_brand') {
    console.log("\n🎉 DISPUTE SYSTEM WORKS!");
  }
}
testDispute();
