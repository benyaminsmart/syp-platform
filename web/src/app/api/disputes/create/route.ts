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
    const { booking_id, opened_by, reason, evidence_url } = body;

    if (!booking_id || !opened_by || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["brand", "creator"].includes(opened_by)) {
      return NextResponse.json({ error: "opened_by must be 'brand' or 'creator'" }, { status: 400 });
    }

    // بررسی وجود رزرو
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, brand_email, status")
      .eq("id", booking_id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // ثبت اختلاف
    const { data: dispute, error } = await supabaseAdmin
      .from("disputes")
      .insert({
        booking_id,
        opened_by,
        opener_email: user.email || "unknown",
        reason,
        evidence_url: evidence_url || null,
        status: "open",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, dispute }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
