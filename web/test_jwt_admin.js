const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line.includes('=')).map(line => line.split('=')));
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testJWT() {
  console.log("🚀 Testing JWT Admin Security...\n");

  const testEmail = `normal_user_${Date.now()}@test.com`;
  const { data: authData } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'Password123!',
    email_confirm: true,
  });
  
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: 'Password123!',
  });
  
  const userToken = signInData.session.access_token;

  console.log("Test 1: Request WITHOUT Token (Expected: 401)");
  let res = await fetch("http://localhost:3000/api/admin/approve-claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim_request_id: "any-id" })
  });
  console.log(`Status: ${res.status} | Error: ${(await res.json()).error}\n`);

  console.log("Test 2: Request WITH Normal User Token (Expected: 403 Forbidden)");
  res = await fetch("http://localhost:3000/api/admin/approve-claim", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userToken}` 
    },
    body: JSON.stringify({ claim_request_id: "any-id" })
  });
  console.log(`Status: ${res.status} | Error: ${(await res.json()).error}\n`);
}
testJWT();
