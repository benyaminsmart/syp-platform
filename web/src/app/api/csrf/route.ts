import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    // تولید توکن CSRF با Web Crypto API
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const randomHex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    
    const timestamp = Date.now().toString();
    const data = `${randomHex}.${timestamp}`;
    
    // HMAC با Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(process.env.CSRF_SECRET || "super-secret-csrf-key-change-in-production"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    const signatureHex = Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('');
    
    const token = `${data}.${signatureHex}`;
    
    return NextResponse.json({ csrfToken: token }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate CSRF token" }, { status: 500 });
  }
}
