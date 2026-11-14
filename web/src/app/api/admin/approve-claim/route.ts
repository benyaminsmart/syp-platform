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
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Only admins can perform this action" }, { status: 403 });
    }

    const body = await req.json();
    const { claim_request_id } = body;

    if (!claim_request_id) {
      return NextResponse.json({ error: "Claim Request ID is required" }, { status: 400 });
    }

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("claim_requests")
      .select("*")
      .eq("id", claim_request_id)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: "Claim request not found" }, { status: 404 });
    }

    if (claim.status !== "pending") {
      return NextResponse.json({ error: "This claim is already processed" }, { status: 400 });
    }

    // دریافت نسخه فعلی پروفایل
    const { data: profile } = await supabaseAdmin
      .from("creators")
      .select("version")
      .eq("id", claim.creator_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // آپدیت با شرط نسخه (Optimistic Locking واقعی)
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from("creators")
      .update({
        status: "verified",
        owner_user_id: claim.user_id,
        version: profile.version + 1, // افزایش دستی نسخه
      })
      .eq("id", claim.creator_id)
      .eq("version", profile.version) // شرط: فقط اگر نسخه هنوز همان است
      .select() // برگرداندن رکورد آپدیت شده
      .maybeSingle(); // اگر آپدیت نشد، null برمی‌گرداند

    if (profileError) throw profileError;

    // اگر updatedProfile خالی بود، یعنی نسخه تغییر کرده (تداخل)
    if (!updatedProfile) {
      return NextResponse.json({ 
        error: "Conflict: The profile was modified by another admin. Please refresh and try again." 
      }, { status: 409 });
    }

    // تغییر وضعیت درخواست به approved
    const { error: updateClaimError } = await supabaseAdmin
      .from("claim_requests")
      .update({ status: "approved" })
      .eq("id", claim_request_id);

    if (updateClaimError) throw updateClaimError;

    return NextResponse.json({
      success: true,
      message: `Profile verified successfully by admin ${user.email}`
    }, { status: 200 });

  } catch (error: any) {
    console.error("Admin Approve API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
