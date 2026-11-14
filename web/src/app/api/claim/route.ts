import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { claimSchema } from "@/lib/validators";
import { validateCsrfToken } from "@/lib/csrf";
import { withCircuitBreaker } from "@/lib/circuit-breaker";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = checkRateLimit(ip, 3, 60000);
    if (!success) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || !validateCsrfToken(csrfToken)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const body = await req.json();
    const validation = claimSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 });
    }

    const { creator_id, user_id, verification_code, story_proof_url } = validation.data;

    // فراخوانی تابع اتمیک دیتابیس
    const result = await withCircuitBreaker("Supabase-DB", async () => {
      const { data, error } = await supabaseAdmin.rpc("process_claim_transaction", {
        p_creator_id: creator_id,
        p_user_id: user_id,
        p_verification_code: verification_code,
        p_story_proof_url: story_proof_url || null
      });

      if (error) throw error;
      return data;
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ success: true, claim_id: result.claim_id }, { status: 201 });

  } catch (error: any) {
    if (error.message.includes("temporarily unavailable")) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
