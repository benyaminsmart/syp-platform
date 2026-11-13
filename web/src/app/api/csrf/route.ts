import { NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/csrf";

export async function GET() {
  try {
    const token = generateCsrfToken();
    return NextResponse.json({ csrfToken: token }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate CSRF token" }, { status: 500 });
  }
}
