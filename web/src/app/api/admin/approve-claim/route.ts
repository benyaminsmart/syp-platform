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

    const { error: profileError } = await supabaseAdmin
      .from("creators")
      .update({
        status: "verified",
        owner_user_id: claim.user_id,
      })
      .eq("id", claim.creator_id);

    if (profileError) throw profileError;

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
