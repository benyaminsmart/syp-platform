// یک نقشه ساده در حافظه سرور برای ذخیره تعداد درخواست‌ها
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // اگر رکوردی نیست یا زمان پنجره تمام شده، رکورد جدید بساز
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  // اگر تعداد درخواست‌ها به سقف رسیده باشد
  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  // در غیر این صورت تعداد را زیاد کن
  record.count++;
  return { success: true, remaining: limit - record.count };
}
