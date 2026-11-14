import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // ۱. بررسی دیتابیس Supabase
  try {
    const dbStart = Date.now();
    const { error } = await supabaseAdmin.from("creators").select("id").limit(1);
    const dbLatency = Date.now() - dbStart;
    
    if (error) {
      checks.database = { status: "DOWN", error: error.message };
    } else {
      checks.database = { status: "UP", latency: dbLatency };
    }
  } catch (err: any) {
    checks.database = { status: "DOWN", error: err.message };
  }

  // ۲. بررسی وجود متغیرهای محیطی حیاتی
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GROQ_API_KEY",
  ];
  
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  checks.environment = {
    status: missingEnvVars.length === 0 ? "UP" : "DEGRADED",
    error: missingEnvVars.length > 0 ? `Missing: ${missingEnvVars.join(", ")}` : undefined,
  };

  // ۳. محاسبه وضعیت کلی
  const allUp = Object.values(checks).every(c => c.status === "UP");
  const overallStatus = allUp ? 200 : 503;
  const totalLatency = Date.now() - startTime;

  const response = {
    status: allUp ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    latency_ms: totalLatency,
    checks,
  };

  return NextResponse.json(response, { status: overallStatus });
}
