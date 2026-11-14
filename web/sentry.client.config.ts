import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  tracesSampleRate: 0.1, // ۱۰٪ از تراکنش‌ها برای بررسی پرفورمنس
  debug: false,
  environment: process.env.NODE_ENV || "development",
  beforeSend(event) {
    // در محیط توسعه، خطاها را به Sentry نفرست (برای جلوگیری از اسپم)
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return event;
  },
});
