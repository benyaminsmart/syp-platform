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

async function testActivationFlow() {
  console.log("🚀 Testing Full Activation Fee Flow...\n");

  // 1. ساخت کاربر کریتور
  const creatorEmail = `creator_${Date.now()}@test.com`;
  const { data: authData } = await supabaseAdmin.auth.admin.createUser({
    email: creatorEmail, password: 'Pass123!', email_confirm: true,
  });
  const { data: signInData } = await supabase.auth.signInWithPassword({ email: creatorEmail, password: 'Pass123!' });
  const creatorToken = signInData.session.access_token;

  // 2. پیدا کردن یک کریتور
  const { data: creator } = await supabaseAdmin.from('creators').select('id, username').is('deleted_at', null).limit(1).single();
  if (!creator) return console.log("❌ No creator found");

  // 3. پاک کردن رکوردهای قبلی هزینه فعال‌سازی برای این کریتور
  console.log("0. Cleaning previous activation records...");
  await supabaseAdmin.from('activation_fees').delete().eq('creator_id', creator.id);
  await supabaseAdmin.from('transactions').delete().eq('transaction_type', 'activation_fee').eq('creator_id', creator.id);
  console.log("✅ Cleanup complete.\n");

  // 4. پرداخت هزینه فعال‌سازی
  console.log("1. Paying activation fee (500 AED)...");
  let res = await fetch("http://localhost:3000/api/activation/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${creatorToken}` },
    body: JSON.stringify({ creator_id: creator.id, payment_method: "credit_card" })
  });
  let data = await res.json();
  console.log(`   Status: ${res.status} | ${data.success ? 'SUCCESS' : 'Error: ' + data.error}\n`);

  // 5. پیدا کردن تراکنش ایجاد شده
  await new Promise(r => setTimeout(r, 500));
  const { data: tx } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('transaction_type', 'activation_fee')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!tx) return console.log("❌ Transaction not found");
  console.log(`2. Transaction created: ${tx.id} (${tx.amount} ${tx.currency})\n`);

  // 6. صدور فاکتور برای این تراکنش
  console.log("3. Generating invoice for activation fee...");
  res = await fetch("http://localhost:3000/api/invoices/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${creatorToken}` },
    body: JSON.stringify({ transaction_id: tx.id, currency: "AED", invoice_type: "activation_fee" })
  });
  data = await res.json();
  console.log(`   Status: ${res.status} | ${data.success ? 'SUCCESS' : 'Error: ' + data.error}\n`);

  if (data.invoice) {
    console.log(`📊 Invoice Number: ${data.invoice.invoice_number}`);
    console.log(`📊 Type: ${data.invoice.invoice_type}`);
    console.log(`📊 Subtotal: ${data.invoice.amount} ${data.invoice.currency}`);
    console.log(`📊 Tax (${data.invoice.tax_rate}%): ${data.invoice.tax_amount} ${data.invoice.currency}`);
    console.log(`📊 Total: ${data.invoice.total_amount} ${data.invoice.currency}`);
    console.log("\n🎉 FULL ACTIVATION FLOW WORKS!");
  }
}
testActivationFlow();
