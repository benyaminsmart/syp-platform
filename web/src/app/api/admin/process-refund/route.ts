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

    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { refund_id, action, admin_notes } = body;

    if (!refund_id || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Missing refund_id or action (approve/reject)" }, { status: 400 });
    }

    // دریافت درخواست استرداد
    const { data: refund } = await supabaseAdmin
      .from("refund_requests")
      .select("*")
      .eq("id", refund_id)
      .single();

    if (!refund) {
      return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
    }

    if (refund.status !== "pending") {
      return NextResponse.json({ error: "Refund request already processed" }, { status: 400 });
    }

    if (action === "approve") {
      // ۱. ثبت تراکنش استرداد در دفتر کل
      const { error: txError } = await supabaseAdmin
        .from("transactions")
        .insert({
          booking_id: refund.booking_id,
          brand_email: refund.brand_email,
          amount: refund.amount,
          platform_fee: 0,
          creator_payout: 0,
          transaction_type: "refund",
          status: "completed",
          description: `Refund approved by admin: ${admin_notes || 'No notes'}`,
        });

      if (txError) throw txError;

      // ۲. آپدیت وضعیت رزرو به refunded
      await supabaseAdmin
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", refund.booking_id);

      // ۳. آپدیت وضعیت استرداد به processed
      await supabaseAdmin
        .from("refund_requests")
        .update({ status: "processed", admin_notes: admin_notes || null, resolved_at: new Date().toISOString() })
        .eq("id", refund_id);

      return NextResponse.json({ success: true, message: "Refund approved and processed." }, { status: 200 });

    } else {
      // رد درخواست
      await supabaseAdmin
        .from("refund_requests")
        .update({ status: "rejected", admin_notes: admin_notes || null, resolved_at: new Date().toISOString() })
        .eq("id", refund_id);

      return NextResponse.json({ success: true, message: "Refund rejected." }, { status: 200 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
