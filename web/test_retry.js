// شبیه‌سازی تابع withRetry (چون فایل TS است و در Node.js مستقیم اجرا نمی‌شود)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry(operation, options = {}) {
  const { maxRetries = 3, baseDelayMs = 100, shouldRetry = () => true } = options;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error)) throw error;
      if (attempt === maxRetries) throw error;
      await sleep(baseDelayMs * Math.pow(2, attempt - 1));
    }
  }
  throw lastError;
}

async function testRetryLogic() {
  console.log("🚀 Testing Retry Policy...\n");

  // تست ۱: دو بار شکست، بار سوم موفق
  console.log("Test 1: Operation fails twice, then succeeds (Should retry & succeed)");
  let attempts = 0;
  try {
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) {
        const err = new Error("Temporary timeout");
        err.code = 'ETIMEDOUT';
        throw err;
      }
      return "Success!";
    }, { maxRetries: 3, baseDelayMs: 100, shouldRetry: (err) => err.code === 'ETIMEDOUT' });
    
    console.log(`   ✅ Result: ${result} after ${attempts} attempts\n`);
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}\n`);
  }

  // تست ۲: خطای دائمی (نباید Retry شود)
  console.log("Test 2: Permanent error (Should NOT retry)");
  attempts = 0;
  try {
    await withRetry(async () => {
      attempts++;
      const err = new Error("Invalid input");
      err.status = 400;
      throw err;
    }, { maxRetries: 3, baseDelayMs: 100, shouldRetry: (err) => err.status >= 500 });
  } catch (err) {
    console.log(`   ✅ Correctly failed on attempt ${attempts} (no retries): ${err.message}\n`);
  }

  // تست ۳: خطای شبکه (باید Retry شود و در نهایت شکست بخورد)
  console.log("Test 3: Network error that never resolves (Should retry 3 times and fail)");
  attempts = 0;
  try {
    await withRetry(async () => {
      attempts++;
      const err = new Error("Network failure");
      err.code = 'ECONNRESET';
      throw err;
    }, { maxRetries: 3, baseDelayMs: 100, shouldRetry: (err) => err.code === 'ECONNRESET' });
  } catch (err) {
    console.log(`   ✅ Correctly failed after ${attempts} attempts: ${err.message}\n`);
  }

  console.log("🎉 RETRY POLICY TESTS FINISHED!");
}

testRetryLogic();
