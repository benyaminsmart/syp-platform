const breakers = new Map<string, { failures: number; lastFailure: number; state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' }>();

const FAILURE_THRESHOLD = 3;
const RECOVERY_TIMEOUT = 30000;

export async function withCircuitBreaker<T>(
  serviceName: string,
  action: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  let breaker = breakers.get(serviceName) || { failures: 0, lastFailure: 0, state: 'CLOSED' };

  if (breaker.state === 'OPEN') {
    if (now - breaker.lastFailure > RECOVERY_TIMEOUT) {
      breaker.state = 'HALF_OPEN';
    } else {
      throw new Error(`Service ${serviceName} is temporarily unavailable. Please try again later.`);
    }
  }

  try {
    const result = await action();
    breaker = { failures: 0, lastFailure: 0, state: 'CLOSED' };
    breakers.set(serviceName, breaker);
    return result;
  } catch (error: any) {
    // فقط خطاهای واقعی سرویس (مثل قطعی شبکه) را به عنوان شکست بشمار
    // خطاهای منطقی (مثل Duplicate Key که کد 23505 دارد) نباید باعث قفل شدن شوند
    const isLogicalError = error.code === "23505" || error.message?.includes("Duplicate request");
    
    if (!isLogicalError) {
      breaker.failures += 1;
      breaker.lastFailure = now;
      
      if (breaker.failures >= FAILURE_THRESHOLD) {
        breaker.state = 'OPEN';
        console.warn(`⚠️ Circuit Breaker OPENED for ${serviceName}`);
      }
      
      breakers.set(serviceName, breaker);
    }
    
    throw error;
  }
}
