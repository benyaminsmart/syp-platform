import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // غیرفعال کردن کش سختگیرانه برای پلتفرم داینامیک
  cacheComponents: false,
  partialPrefetching: false,

  // تنظیمات امنیتی و اجازه دادن به آی‌پی شبکه
  allowedDevOrigins: ['10.199.4.138', 'localhost:3000'],

  // هدرهای امنیتی (Security Headers)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // جلوگیری از XSS
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // جلوگیری از Clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // جلوگیری از MIME Sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // سیاست Referrer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Content Security Policy (CSP) - سختگیرانه
          { 
            key: 'Content-Security-Policy', 
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://api.groq.com;" 
          },
          // HSTS (فقط برای HTTPS در پروداکشن)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Permissions Policy
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
