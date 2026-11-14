import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 1. احراز هویت (JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // 2. دریافت آیدی پروفایل از بدنه درخواست
    const body = await req.json();
    const { creator_id } = body;

    if (!creator_id) {
      return NextResponse.json({ error: "Creator ID is required" }, { status: 400 });
    }

    // 3. بررسی مجوز (فقط ادمین یا صاحب پروفایل)
    const { data: creator } = await supabaseAdmin
      .from("creators")
      .select("owner_user_id")
      .eq("id", creator_id)
      .single();

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin";
    const isOwner = creator.owner_user_id === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete this profile" }, { status: 403 });
    }

    // 4. انجام Soft Delete (پر کردن ستون deleted_at)
    const { error: deleteError } = await supabaseAdmin
      .from("creators")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", creator_id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: "Profile soft-deleted successfully." }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
