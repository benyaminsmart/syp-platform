const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

// استفاده از ANON_KEY برای تست RLS
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
const supabaseAdmin = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testInvoice() {
  console.log("🚀 Testing Invoice System with RLS Active...\n");

  // 1. ساخت کاربر ادمین (با service_role)
  const adminEmail = `admin_${Date.now()}@test.com`;
  const { data: authData } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail, password: 'Pass123!', email_confirm: true,
  });
  await supabaseAdmin.rpc('promote_to_admin', { user_id: authData.user.id });

  // 2. لاگین با کاربر ادمین (با ANON_KEY برای دریافت توکن)
  const { data: signInData } = await supabase.auth.signInWithPassword({ 
    email: adminEmail, password: 'Pass123!' 
  });
  const adminToken = signInData.session.access_token;
  const adminUserId = authData.user.id;

  // 3. پیدا کردن کریتور (با service_role)
  const { data: creators } = await supabaseAdmin.from('creators').select('id, username').is('deleted_at', null).limit(1);
  if (!creators || creators.length === 0) return console.log("❌ No active creators found.");
  const creator = creators[0];
  console.log(`✅ Using creator: @${creator.username}\n`);

  // 4. ساخت رزرو (با توکن ادمین، RLS فعال)
  console.log("0. Creating test booking with RLS active...");
  const { data: booking, error: bookingError } = await supabase.from('bookings').insert({
    creator_id: creator.id,
    brand_id: adminUserId, 
    brand_email: adminEmail,
    brand_name: "Test Brand",
    campaign_brief: "Test for invoice with RLS",
    budget: 1000,
    amount_usd: 1000,
    platform_fee_usd: 100,
    status: "in_escrow",
    idempotency_key: crypto.randomUUID(),
  }).select().single();

  if (bookingError) return console.log("❌ Booking Error:", bookingError.message);
  console.log(`✅ Booking created (ID: ${booking.id})\n`);

  // 5. ساخت تراکنش (با service_role برای ادمین)
  console.log("1. Creating transaction (via service_role)...");
  const { data: tx, error: txError } = await supabaseAdmin.from('transactions').insert({
    booking_id: booking.id,
    creator_id: creator.id,
    brand_email: adminEmail,
    amount: 1000,
    platform_fee: 100,
    creator_payout: 900,
    transaction_type: "payment",
    status: "completed",
  }).select().single();

  if (txError) return console.log("❌ Transaction Error:", txError.message);
  console.log(`✅ Transaction created (ID: ${tx.id})\n`);

  // 6. تولید فاکتور
  console.log("2. Generating invoice with 5% VAT (AED)...");
  const invoiceRes = await fetch("http://localhost:3000/api/invoices/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
    body: JSON.stringify({ transaction_id: tx.id, currency: "AED" })
  });
  
  const invoiceData = await invoiceRes.json();
  console.log(`   Status: ${invoiceRes.status} | ${invoiceData.success ? 'SUCCESS' : 'Error: ' + invoiceData.error}\n`);
  
  if (!invoiceData.invoice) return;

  console.log(`📊 Invoice Number: ${invoiceData.invoice.invoice_number}`);
  console.log(`📊 Subtotal: ${invoiceData.invoice.amount} ${invoiceData.invoice.currency}`);
  console.log(`📊 Tax (${invoiceData.invoice.tax_rate}%): ${invoiceData.invoice.tax_amount} ${invoiceData.invoice.currency}`);
  console.log(`📊 Total: ${invoiceData.invoice.total_amount} ${invoiceData.invoice.currency}`);

  if (invoiceData.invoice.tax_amount === 50 && invoiceData.invoice.total_amount === 1050) {
    console.log("\n🎉 INVOICE & VAT SYSTEM WORKS WITH RLS ACTIVE!");
  }
}
testInvoice();
