async function testMultiCurrency() {
  console.log("🚀 Testing Multi-Currency System...\n");

  // تست ۱: تبدیل USD به AED
  console.log("Test 1: Converting 100 USD to AED...");
  let res = await fetch("http://localhost:3000/api/currency/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 100, from_currency: "USD", to_currency: "AED" })
  });
  let data = await res.json();
  console.log(`   ${data.amount} ${data.from_currency} = ${data.converted_amount} ${data.to_currency}`);
  console.log(`   Rate: ${data.rate}\n`);

  // تست ۲: تبدیل AED به EUR
  console.log("Test 2: Converting 1000 AED to EUR...");
  res = await fetch("http://localhost:3000/api/currency/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 1000, from_currency: "AED", to_currency: "EUR" })
  });
  data = await res.json();
  console.log(`   ${data.amount} ${data.from_currency} = ${data.converted_amount} ${data.to_currency}`);
  console.log(`   Rate: ${data.rate}\n`);

  // تست ۳: ارز یکسان
  console.log("Test 3: Converting USD to USD (same currency)...");
  res = await fetch("http://localhost:3000/api/currency/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 500, from_currency: "USD", to_currency: "USD" })
  });
  data = await res.json();
  console.log(`   ${data.amount} ${data.from_currency} = ${data.converted_amount} ${data.to_currency}`);
  console.log(`   Rate: ${data.rate}\n`);

  if (data.converted_amount === 500 && data.rate === 1) {
    console.log("🎉 MULTI-CURRENCY SYSTEM WORKS!");
  }
}
testMultiCurrency();
