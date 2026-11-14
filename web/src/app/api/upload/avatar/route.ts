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
    const { creator_id, image_base64 } = body;

    if (!creator_id) {
      return NextResponse.json({ error: "Missing creator_id" }, { status: 400 });
    }

    const { data: creator } = await supabaseAdmin
      .from("creators")
      .select("username")
      .eq("id", creator_id)
      .single();

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    // در این نسخه، ما فقط URL را می‌سازیم (بدون پردازش sharp)
    const newAvatarUrl = `https://test-cdn.com/avatars/${creator.username}_${Date.now()}.webp`;

    const { error: updateError } = await supabaseAdmin
      .from("creators")
      .update({ avatar_url: newAvatarUrl })
      .eq("id", creator_id);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: "Avatar URL updated (test mode, no sharp)", 
      avatar_url: newAvatarUrl 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔴 UPLOAD API ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
