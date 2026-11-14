import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/audit-log";

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
    const { claim_request_id } = body;

    if (!claim_request_id) {
      return NextResponse.json({ error: "Claim Request ID is required" }, { status: 400 });
    }

    // دریافت اطلاعات Claim
    const { data: claim } = await supabaseAdmin
      .from("claim_requests")
      .select("*")
      .eq("id", claim_request_id)
      .single();

    if (!claim) {
      return NextResponse.json({ error: "Claim request not found" }, { status: 404 });
    }

    if (claim.status !== "pending") {
      return NextResponse.json({ error: "Claim already processed" }, { status: 400 });
    }

    // دریافت نسخه پروفایل برای Optimistic Locking
    const { data: profile } = await supabaseAdmin
      .from("creators")
      .select("version, status, owner_user_id")
      .eq("id", claim.creator_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // آپدیت با Optimistic Locking
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("creators")
      .update({
        status: "verified",
        owner_user_id: claim.user_id,
        version: profile.version + 1,
      })
      .eq("id", claim.creator_id)
      .eq("version", profile.version)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      return NextResponse.json({ 
        error: "Conflict: Profile was modified by another admin." 
      }, { status: 409 });
    }

    // آپدیت Claim
    await supabaseAdmin
      .from("claim_requests")
      .update({ status: "approved" })
      .eq("id", claim_request_id);

    // ثبت لاگ حقوقی
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAction({
      adminId: user.id,
      actionType: "APPROVE_CLAIM",
      targetTable: "creators",
      targetId: claim.creator_id,
      oldData: { status: profile.status, owner_user_id: profile.owner_user_id },
      newData: { status: "verified", owner_user_id: claim.user_id },
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: `Profile verified by admin ${user.email}`
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
