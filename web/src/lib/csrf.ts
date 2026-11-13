import crypto from "crypto";

// یک کلید مخفی برای امضای توکن (باید در .env باشد، فعلاً یک مقدار پیش‌فرض گذاشتیم)
const CSRF_SECRET = process.env.CSRF_SECRET || "super-secret-csrf-key-change-in-production";

// تولید توکن CSRF
export function generateCsrfToken() {
  const random = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now().toString();
  const data = `${random}.${timestamp}`;
  const signature = crypto.createHmac("sha256", CSRF_SECRET).update(data).digest("hex");
  return `${data}.${signature}`;
}

// اعتبارسنجی توکن CSRF
export function validateCsrfToken(token: string) {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [random, timestamp, signature] = parts;
  const data = `${random}.${timestamp}`;
  const expectedSignature = crypto.createHmac("sha256", CSRF_SECRET).update(data).digest("hex");

  // بررسی اینکه امضا درست است
  if (signature !== expectedSignature) return false;

  // بررسی اینکه توکن منقضی نشده باشد (حداکثر ۱ ساعت اعتبار)
  const tokenAge = Date.now() - parseInt(timestamp);
  if (tokenAge > 60 * 60 * 1000) return false;

  return true;
}
