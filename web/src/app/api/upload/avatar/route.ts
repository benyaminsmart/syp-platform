import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// محدودیت‌های امنیتی
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // ۲ مگابایت (پس از دیکد Base64)
const MAX_BASE64_LENGTH = 3 * 1024 * 1024;     // ~۳ مگابایت (Base64)
const MAX_UPLOADS_PER_DAY = 5;                  // حداکثر ۵ آپلود در روز

export async function POST(req: Request) {
  try {
    // ۱. احراز هویت
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // ۲. خواندن بدنه
    const body = await req.json();
    const { creator_id, image_base64 } = body;

    if (!creator_id || !image_base64) {
      return NextResponse.json({ error: "Missing creator_id or image_base64" }, { status: 400 });
    }

    // ۳. بررسی حجم Base64
    if (image_base64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ 
        error: `Image too large. Max size: 2MB (received: ${(image_base64.length / 1024 / 1024).toFixed(2)}MB)`,
        max_size_mb: 2,
      }, { status: 413 });
    }

    // ۴. بررسی حجم پس از دیکد (تقریبی)
    const estimatedSize = (image_base64.length * 3) / 4;
    if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ 
        error: `Image too large after decoding. Max: 2MB`,
      }, { status: 413 });
    }

    // ۵. بررسی سهمیه روزانه
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayUploads } = await supabaseAdmin
      .from("audit_logs")
      .select("id")
      .eq("admin_id", user.id)
      .eq("action_type", "UPLOAD_AVATAR")
      .gte("created_at", todayStart.toISOString());

    if (todayUploads && todayUploads.length >= MAX_UPLOADS_PER_DAY) {
      return NextResponse.json({ 
        error: `Daily upload limit reached (max: ${MAX_UPLOADS_PER_DAY} per day)`,
        limit: MAX_UPLOADS_PER_DAY,
      }, { status: 429 });
    }

    // ۶. بررسی وجود کریتور
    const { data: creator } = await supabaseAdmin
      .from("creators")
      .select("username")
      .eq("id", creator_id)
      .single();

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    // ۷. (در حالت واقعی، اینجا آپلود به R2 انجام می‌شود)
    const newAvatarUrl = `https://test-cdn.com/avatars/${creator.username}_${Date.now()}.webp`;

    // ۸. آپدیت دیتابیس
    const { error: updateError } = await supabaseAdmin
      .from("creators")
      .update({ avatar_url: newAvatarUrl })
      .eq("id", creator_id);

    if (updateError) throw updateError;

    // ۹. ثبت لاگ برای شمارش سهمیه
    await supabaseAdmin.from("audit_logs").insert({
      admin_id: user.id,
      action_type: "UPLOAD_AVATAR",
      target_table: "creators",
      target_id: creator_id,
      new_data: { avatar_url: newAvatarUrl, size_bytes: Math.round(estimatedSize) },
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({
      success: true,
      message: "Avatar uploaded successfully",
      avatar_url: newAvatarUrl,
      size_bytes: Math.round(estimatedSize),
      uploads_today: (todayUploads?.length || 0) + 1,
      daily_limit: MAX_UPLOADS_PER_DAY,
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔴 UPLOAD API ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
