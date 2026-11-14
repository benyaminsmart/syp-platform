import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // استخراج IP و User Agent از هدرها
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // ثبت رضایت‌نامه
    const { data: consent, error } = await supabaseAdmin
      .from("user_consents")
      .upsert({
        user_id: user.id,
        user_email: user.email,
        tos_version: "1.0",
        privacy_version: "1.0",
        tos_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent,
      }, {
        onConflict: "user_id,tos_version,privacy_version",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: "Terms of Service and Privacy Policy accepted.",
      consent 
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// بررسی اینکه آیا کاربر قبلاً رضایت‌نامه را پذیرفته است
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const { data: consent } = await supabaseAdmin
      .from("user_consents")
      .select("*")
      .eq("user_id", user.id)
      .eq("tos_version", "1.0")
      .eq("privacy_version", "1.0")
      .single();

    if (consent) {
      return NextResponse.json({ 
        success: true, 
        has_consented: true, 
        consented_at: consent.created_at 
      }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true, 
      has_consented: false 
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
