// بررسی متغیرهای محیطی حیاتی
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY",
] as const;

const OPTIONAL_ENV_VARS = [
  "NEXT_PUBLIC_SENTRY_DSN",
  "CSRF_SECRET",
  "ADMIN_SECRET_KEY",
] as const;

export function checkEnvironment() {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  REQUIRED_ENV_VARS.forEach(key => {
    if (!process.env[key]) missingRequired.push(key);
  });

  OPTIONAL_ENV_VARS.forEach(key => {
    if (!process.env[key]) missingOptional.push(key);
  });

  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "development";

  return {
    environment,
    isHealthy: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    nodeEnv: process.env.NODE_ENV,
  };
}

// این تابع را در زمان راه‌اندازی سرور صدا بزن
export function validateEnvironment() {
  const result = checkEnvironment();
  
  console.log(`\n🌍 Environment: ${result.environment.toUpperCase()}`);
  console.log(`📦 Node Env: ${result.nodeEnv}\n`);
  
  if (result.missingRequired.length > 0) {
    console.error("❌ Missing REQUIRED env vars:");
    result.missingRequired.forEach(v => console.error(`   - ${v}`));
    throw new Error("Missing required environment variables");
  }
  
  if (result.missingOptional.length > 0) {
    console.warn("⚠️  Missing OPTIONAL env vars:");
    result.missingOptional.forEach(v => console.warn(`   - ${v}`));
  }
  
  console.log("✅ Environment validation passed.\n");
  return result;
}
