async function testWebhook() {
  console.log("🚀 Testing Stripe Webhook Security (HMAC)...\n");

  // تست ۱: پیام بدون امضا (بدون هدر stripe-signature)
  console.log("Test 1: Request WITHOUT Signature (Expected: 400)");
  let res = await fetch("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "payment_intent.succeeded", data: { object: { amount: 50000 } } })
  });
  let data = await res.json();
  console.log(`Status: ${res.status} | Error: ${data.error}\n`);

  // تست ۲: پیام با امضای جعلی (هکر امضا را جعل می‌کند)
  console.log("Test 2: Request WITH FAKE Signature (Expected: 400)");
  res = await fetch("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "stripe-signature": "t=123,v1=fake_signature_hash_here"
    },
    body: JSON.stringify({ type: "payment_intent.succeeded", data: { object: { amount: 50000 } } })
  });
  data = await res.json();
  console.log(`Status: ${res.status} | Error: ${data.error}\n`);

  console.log("🎉 WEBHOOK SECURITY TEST FINISHED!");
}
testWebhook();
