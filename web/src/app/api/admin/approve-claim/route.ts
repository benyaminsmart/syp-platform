import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// استفاده از کلید سرویس (فقط در سمت سرور اجرا می‌شود)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { claim_request_id, admin_secret } = body;

    // 1. لایه امنیتی اول: بررسی اینکه درخواست از طرف ادمین است
    // (در فاز ۶ این را با لاگین ادمین جایگزین می‌کنیم، فعلاً با یک رمز مخفی)
    if (admin_secret !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized: Invalid Admin Key" }, { status: 401 });
    }

    if (!claim_request_id) {
      return NextResponse.json({ error: "Claim Request ID is required" }, { status: 400 });
    }

    // 2. پیدا کردن اطلاعات درخواست Claim
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

    // 3. آپدیت پروفایل (انتقال مالکیت و تغییر وضعیت به verified)
    const { error: profileError } = await supabaseAdmin
      .from("creators")
      .update({
        status: "verified",
        owner_user_id: claim.user_id,
      })
      .eq("id", claim.creator_id);

    if (profileError) throw profileError;

    // 4. تغییر وضعیت درخواست به approved
    const { error: updateClaimError } = await supabaseAdmin
      .from("claim_requests")
      .update({ status: "approved" })
      .eq("id", claim_request_id);

    if (updateClaimError) throw updateClaimError;

    return NextResponse.json({ 
      success: true, 
      message: "Creator profile successfully claimed and verified." 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Admin Approve API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
