import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ۱. افزودن هدرهای امنیتی اضافی (لایه دوم)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // ۲. لاگ کردن IP برای شناسایی حملات
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const path = request.nextUrl.pathname;
  
  // لاگ فقط برای مسیرهای حساس
  if (path.startsWith("/api/admin") || path.startsWith("/api/activation")) {
    console.log(`[MIDDLEWARE] ${request.method} ${path} from IP: ${ip}`);
  }

  // ۳. هدایت HTTP به HTTPS (فقط در پروداکشن)
  if (
    process.env.NODE_ENV === "production" &&
    request.headers.get("x-forwarded-proto") === "http"
  ) {
    return NextResponse.redirect(
      `https://${request.headers.get("host")}${request.nextUrl.pathname}`,
      301
    );
  }

  return response;
}

// تنظیمات: روی کدام مسیرها اجرا شود
export const config = {
  matcher: [
    // همه مسیرها به جز فایل‌های استاتیک
    "/((?!_next/static|_next/image|favicon.ico|logo.jpg).*)",
  ],
};
