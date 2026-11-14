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
    const { booking_id, reason } = body;

    if (!booking_id || !reason) {
      return NextResponse.json({ error: "Missing booking_id or reason" }, { status: 400 });
    }

    // دریافت اطلاعات رزرو
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, amount_usd, brand_email, status")
      .eq("id", booking_id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "in_escrow" && booking.status !== "submitted") {
      return NextResponse.json({ error: "Refund only allowed for bookings in escrow or submitted status" }, { status: 400 });
    }

    // ثبت درخواست استرداد
    const { data: refund, error: refundError } = await supabaseAdmin
      .from("refund_requests")
      .insert({
        booking_id: booking.id,
        brand_email: booking.brand_email,
        reason: reason,
        amount: booking.amount_usd,
        status: "pending",
      })
      .select()
      .single();

    if (refundError) throw refundError;

    return NextResponse.json({ success: true, refund }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
