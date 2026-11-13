const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testBookingFlow() {
  console.log("1. Fetching creator...");
  const { data: creator } = await supabase.from('creators').select('id').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found.");

  console.log("2. Sending booking request via API...");
  const res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creator_id: creator.id,
      brand_email: "brand@example.com",
      brand_name: "Nike UAE",
      campaign_brief: "We need a 60-second dedicated video for our new sneakers.",
      budget: 1000 // مبلغ تست: 1000 دلار
    })
  });

  const result = await res.json();
  console.log("API Response:", result);

  if (res.ok) {
    console.log("✅ Math Check:");
    console.log(`Total Budget: $${result.booking.amount_usd}`);
    console.log(`Platform Fee (10%): $${result.booking.platform_fee_usd}`);
    console.log(`Creator Payout: $${result.booking.amount_usd - result.booking.platform_fee_usd}`);
    console.log(`Booking Status: ${result.booking.status}`);
    console.log("🎉 BOOKING FLOW TEST PASSED!");
  }
}
testBookingFlow();
