import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// حد مجاز بدون KYC (۱۰,۰۰۰ درهم)
const KYC_THRESHOLD = 10000;

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
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // اگر مبلغ زیر حد مجاز است، نیازی به KYC نیست
    if (amount <= KYC_THRESHOLD) {
      return NextResponse.json({ 
        success: true, 
        kyc_required: false, 
        message: "Amount is below KYC threshold." 
      }, { status: 200 });
    }

    // بررسی وضعیت KYC کاربر
    const { data: kyc } = await supabaseAdmin
      .from("kyc_verifications")
      .select("status")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .single();

    if (kyc) {
      return NextResponse.json({ 
        success: true, 
        kyc_required: false, 
        message: "KYC verified. Transaction allowed." 
      }, { status: 200 });
    }

    // KYC تایید نشده
    return NextResponse.json({ 
      success: false, 
      kyc_required: true, 
      error: `Transaction amount (${amount}) exceeds KYC threshold (${KYC_THRESHOLD}). Please complete KYC verification first.` 
    }, { status: 403 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
