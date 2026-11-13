import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // دریافت IP (در حالت واقعی از هدرها خوانده می‌شود)
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    
    // محدودیت: ۵ درخواست در ۶۰ ثانیه (۶۰۰۰۰ میلی‌ثانیه)
    const { success, remaining } = checkRateLimit(ip, 5, 60000);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
      );
    }

    const randomBytes = crypto.randomBytes(3).toString("hex").toUpperCase();
    const verificationCode = `SYP-${randomBytes}`;

    return NextResponse.json(
      { success: true, code: verificationCode }, 
      { status: 200, headers: { "X-RateLimit-Remaining": remaining.toString() } }
    );

  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
  }
}
