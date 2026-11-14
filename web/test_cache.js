async function testCache() {
  console.log("🚀 Testing Redis/Memory Cache...\n");

  const url = "http://localhost:3000/api/creators?limit=5";

  // 1. درخواست اول (باید Cache Miss باشد)
  console.log("Request 1: First request (Should be CACHE MISS)...");
  let start = Date.now();
  let res = await fetch(url);
  let data = await res.json();
  let time1 = Date.now() - start;
  console.log(`✅ Status: ${res.status} | Time: ${time1}ms | Found: ${data.creators?.length || 0} creators\n`);

  // 2. درخواست دوم (باید Cache Hit باشد و سریع‌تر)
  console.log("Request 2: Second request with SAME parameters (Should be CACHE HIT)...");
  start = Date.now();
  res = await fetch(url);
  data = await res.json();
  let time2 = Date.now() - start;
  console.log(`✅ Status: ${res.status} | Time: ${time2}ms | Found: ${data.creators?.length || 0} creators\n`);

  // 3. مقایسه زمان
  if (time2 < time1) {
    console.log(`🎉 CACHE WORKS! Second request was ${time1 - time2}ms faster.`);
  } else {
    console.log(`⚠️ Second request was not faster (${time2}ms vs ${time1}ms). Maybe cache TTL expired or not working.`);
  }
}
testCache();
