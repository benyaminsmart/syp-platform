import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // غیرفعال کردن کش سختگیرانه برای پلتفرم داینامیک
  cacheComponents: false,
  partialPrefetching: false,
  
  // تنظیمات امنیتی و اجازه دادن به آی‌پی شبکه
  allowedDevOrigins: ['10.199.4.138', 'localhost:3000'],
};

export default nextConfig;
