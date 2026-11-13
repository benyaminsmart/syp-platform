import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    // محدودیت: ۳ درخواست در ۶۰ ثانیه
    const { success } = checkRateLimit(ip, 3, 60000);

    if (!success) {
      return NextResponse.json({ error: "Too many claim attempts. Wait a minute." }, { status: 429 });
    }

    const body = await req.json();
    const { creator_id, user_id, verification_code, story_proof_url } = body;

    if (!creator_id || !user_id || !verification_code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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

    await supabaseAdmin
      .from("creators")
      .update({ status: "pending_claim" })
      .eq("id", creator_id);

    return NextResponse.json({ success: true, claim: data }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
