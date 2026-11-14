// تابع کمکی برای تاخیر
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const { 
    maxRetries = 3, 
    baseDelayMs = 1000,
    shouldRetry = (error) => {
      // به طور پیش‌فرض، فقط خطاهای شبکه‌ای یا خطاهای 5xx را Retry کن
      const isNetworkError = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND';
      const isServerError = error.status >= 500 && error.status < 600;
      return isNetworkError || isServerError;
    }
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // اگر این خطا نباید Retry شود، بلافاصله خطا را برگردان
      if (!shouldRetry(error)) {
        throw error;
      }
      
      // اگر آخرین تلاش بود، خطا را برگردان
      if (attempt === maxRetries) {
        console.error(`[RETRY] All ${maxRetries} attempts failed.`);
        throw error;
      }
      
      // Exponential Backoff: 1s, 2s, 4s...
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`[RETRY] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}
