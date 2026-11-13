import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ما از Service Role Key استفاده می‌کنیم تا حتی اگر RLS سختگیرانه باشد، ادمین سیستم بتواند عملیات را انجام دهد
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { creator_id, user_id, verification_code, story_proof_url } = body;

    // 1. اعتبارسنجی ورودی‌ها (جلوگیری از دیتای خالی)
    if (!creator_id || !user_id || !verification_code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. بررسی اینکه آیا این کاربر قبلاً درخواست داده است یا نه (جلوگیری از اسپم)
    const { data: existingClaim } = await supabaseAdmin
      .from("claim_requests")
      .select("id")
      .eq("creator_id", creator_id)
      .eq("user_id", user_id)
      .eq("status", "pending")
      .single();

    if (existingClaim) {
      return NextResponse.json({ error: "You already have a pending claim for this profile." }, { status: 409 });
    }

    // 3. ثبت درخواست جدید در دیتابیس
    const { data, error } = await supabaseAdmin
      .from("claim_requests")
      .insert({
        creator_id,
        user_id,
        verification_code,
        story_proof_url: story_proof_url || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // 4. (اختیاری) اینجا می‌توانیم وضعیت پروفایل را به pending_claim تغییر دهیم
    await supabaseAdmin
      .from("creators")
      .update({ status: "pending_claim" })
      .eq("id", creator_id);

    return NextResponse.json({ success: true, claim: data }, { status: 201 });

  } catch (error: any) {
    console.error("Claim API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
