import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST() {
  try {
    // تولید یک کد امن ۶ رقمی با استفاده از ماژول رمزنگاری Node.js
    const randomBytes = crypto.randomBytes(3).toString("hex").toUpperCase();
    const verificationCode = `SYP-${randomBytes}`;

    // در اینجا می‌توانیم کد را در دیتابیس (جدول claim_requests) ذخیره کنیم
    // اما چون در مرحله ثبت نهایی (Submit) این کار را می‌کنیم، فعلاً فقط برمی‌گردانیم.
    
    return NextResponse.json({ 
      success: true, 
      code: verificationCode 
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
  }
}
