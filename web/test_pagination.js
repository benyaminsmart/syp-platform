async function testPagination() {
  console.log("🚀 Testing Cursor-based Pagination...\n");

  // 1. درخواست صفحه اول (بدون cursor)
  console.log("Request 1: Fetching first page (limit=2)...");
  let res = await fetch("http://localhost:3000/api/creators?limit=2");
  let data = await res.json();

  if (!data.success) return console.log("❌ Failed to fetch first page");
  
  console.log(`✅ Received ${data.creators.length} creators.`);
  data.creators.forEach((c, i) => console.log(`   [${i+1}] ${c.username} (Followers: ${c.followers_count})`));
  
  const firstPageCursor = data.nextCursor;
  console.log(`🔑 Next Cursor (followers_count of last item): ${firstPageCursor}\n`);

  if (!firstPageCursor) {
    console.log("⚠️ No next cursor returned. Cannot test page 2 (maybe less than 2 creators in DB).");
    return;
  }

  // 2. درخواست صفحه دوم (با cursor)
  console.log("Request 2: Fetching second page using cursor...");
  res = await fetch(`http://localhost:3000/api/creators?limit=2&cursor=${firstPageCursor}`);
  data = await res.json();

  if (!data.success) return console.log("❌ Failed to fetch second page");

  console.log(`✅ Received ${data.creators.length} creators.`);
  data.creators.forEach((c, i) => console.log(`   [${i+1}] ${c.username} (Followers: ${c.followers_count})`));

  // 3. بررسی اینکه آیا صفحه دوم با صفحه اول تداخل دارد یا نه
  console.log("\n📊 Verifying no duplicates...");
  const firstPageIds = new Set(); // (برای سادگی، ما فقط cursor را چک می‌کنیم)
  
  if (data.creators.length > 0 && data.creators[0].followers_count >= firstPageCursor) {
    console.log("❌ ERROR: Pagination failed! Second page contains items with followers >= cursor (duplicates).");
  } else {
    console.log("🎉 PAGINATION WORKS! Second page correctly starts after the cursor.");
  }
}
testPagination();
