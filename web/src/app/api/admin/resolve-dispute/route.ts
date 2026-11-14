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
    const { dispute_id, decision, admin_notes } = body;

    if (!dispute_id || !decision) {
      return NextResponse.json({ error: "Missing dispute_id or decision" }, { status: 400 });
    }

    if (!["resolved_brand", "resolved_creator", "closed"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    // آپدیت اختلاف
    const { error } = await supabaseAdmin
      .from("disputes")
      .update({
        status: decision,
        admin_decision: admin_notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", dispute_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Dispute resolved." }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
