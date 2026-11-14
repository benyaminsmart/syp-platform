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

    const body = await req.json();
    const { full_name, document_type, document_url } = body;

    if (!full_name || !document_type || !document_url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["passport", "national_id", "driver_license"].includes(document_type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    // بررسی اینکه آیا کاربر قبلاً درخواست داده
    const { data: existing } = await supabaseAdmin
      .from("kyc_verifications")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (existing) {
      return NextResponse.json({ error: "You already have a pending KYC request." }, { status: 409 });
    }

    // ثبت درخواست
    const { data: kyc, error } = await supabaseAdmin
      .from("kyc_verifications")
      .insert({
        user_id: user.id,
        user_email: user.email,
        full_name,
        document_type,
        document_url,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, kyc }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
