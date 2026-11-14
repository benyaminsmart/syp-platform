const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testTransactions() {
  console.log("🚀 Testing Booking + Transaction Ledger...\n");

  const { data: creator } = await supabase.from('creators').select('id').eq('username', 'dubaitech_demo').single();
  if (!creator) return console.log("❌ Creator not found");

  const csrfRes = await fetch("http://localhost:3000/api/csrf");
  const { csrfToken } = await csrfRes.json();

  const idempotencyKey = crypto.randomUUID();
  const budget = 1000;

  console.log("Sending booking request...");
  const res = await fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
      "x-idempotency-key": idempotencyKey
    },
    body: JSON.stringify({
      creator_id: creator.id,
      brand_email: "ledger_test@example.com",
      brand_name: "Ledger Test Brand",
      campaign_brief: "Testing the financial transaction ledger.",
      budget: budget
    })
  });

  const data = await res.json();
  console.log(`Status: ${res.status} | Success: ${data.success || 'Failed'}`);

  if (res.ok) {
    console.log("\n📊 Verifying Database Records...");
    
    // ۱. بررسی جدول رزروها
    const { data: booking } = await supabase.from('bookings').select('*').eq('idempotency_key', idempotencyKey).single();
    console.log(`✅ Booking Found: $${booking.amount_usd} | Fee: $${booking.platform_fee_usd} | Status: ${booking.status}`);

    // ۲. بررسی جدول تراکنش‌ها
    const { data: transactions } = await supabase.from('transactions').select('*').eq('booking_id', booking.id);
    
    if (transactions && transactions.length === 1) {
      const tx = transactions[0];
      console.log(`✅ Transaction Found: Type: ${tx.transaction_type} | Amount: $${tx.amount} | Creator Payout: $${tx.creator_payout}`);
      console.log(`\n🎉 LEDGER INTEGRITY CONFIRMED! Both records created successfully.`);
    } else {
      console.log(`❌ Transaction missing or duplicated (Found: ${transactions?.length || 0}).`);
    }
  }
}
testTransactions();
