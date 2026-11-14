import { NextResponse } from "next/server";
import { claimCodeEdgeLimiter } from "@/lib/rate-limit-edge";

// 👈 این خط API را به Edge منتقل می‌کند
export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, remaining } = await claimCodeEdgeLimiter.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429 }
      );
    }

    // تولید کد امن با Web Crypto API (سازگار با Edge)
    const array = new Uint8Array(3);
    crypto.getRandomValues(array);
    const randomHex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const verificationCode = `SYP-${randomHex}`;

    return NextResponse.json(
      { success: true, code: verificationCode }, 
      { status: 200, headers: { "X-RateLimit-Remaining": remaining.toString() } }
    );

  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
  }
}
