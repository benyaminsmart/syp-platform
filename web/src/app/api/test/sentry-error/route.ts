import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    // ایجاد یک خطای عمدی
    throw new Error("Sentry Test Error: This is intentional for testing purposes.");
  } catch (error: any) {
    // ارسال خطا به Sentry
    Sentry.captureException(error);
    
    return NextResponse.json({ 
      success: false, 
      message: "Error sent to Sentry for testing.",
      error: error.message 
    }, { status: 500 });
  }
}
