import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// هزینه فعال‌سازی پنل کریتور (به درهم)
const ACTIVATION_FEE_AED = 500;

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
    const { creator_id, payment_method } = body;

    if (!creator_id) {
      return NextResponse.json({ error: "Missing creator_id" }, { status: 400 });
    }

    // بررسی اینکه آیا کریتور قبلاً هزینه را پرداخت کرده
    const { data: existing } = await supabaseAdmin
      .from("activation_fees")
      .select("id, status")
      .eq("creator_id", creator_id)
      .eq("status", "paid")
      .single();

    if (existing) {
      return NextResponse.json({ error: "Activation fee already paid" }, { status: 409 });
    }

    // ثبت هزینه فعال‌سازی (شبیه‌سازی پرداخت)
    const { data: activation, error: activationError } = await supabaseAdmin
      .from("activation_fees")
      .insert({
        creator_id,
        amount: ACTIVATION_FEE_AED,
        currency: "AED",
        status: "paid",
        payment_method: payment_method || "simulated",
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (activationError) throw activationError;

    // ثبت تراکنش مالی برای هزینه فعال‌سازی
    const { error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        activation_fee_id: activation.id,
        creator_id: creator_id,
        brand_email: user.email || "unknown",
        amount: ACTIVATION_FEE_AED,
        platform_fee: ACTIVATION_FEE_AED, // کل مبلغ برای پلتفرم است
        creator_payout: 0,
        currency: "AED",
        transaction_type: "activation_fee",
        status: "completed",
        description: `Panel activation fee for creator ${creator_id}`,
      });

    if (txError) throw txError;

    return NextResponse.json({ 
      success: true, 
      message: `Activation fee of ${ACTIVATION_FEE_AED} AED paid successfully.`,
      activation 
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
