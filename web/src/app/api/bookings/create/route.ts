import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validators";
import { validateCsrfToken } from "@/lib/csrf";
import { withCircuitBreaker } from "@/lib/circuit-breaker";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLATFORM_FEE_PERCENTAGE = 10;

export async function POST(req: Request) {
  try {
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || !validateCsrfToken(csrfToken)) {
      return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
    }

    const body = await req.json();
    const idempotencyKey = req.headers.get("x-idempotency-key") || null;

    const validation = bookingSchema.safeParse({ ...body, idempotency_key: idempotencyKey });
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input data", details: validation.error.format() }, { status: 400 });
    }

    const { creator_id, package_id, brand_email, brand_name, campaign_brief, budget, idempotency_key } = validation.data;
    const platform_fee = (budget * PLATFORM_FEE_PERCENTAGE) / 100;

    try {
      const booking = await withCircuitBreaker("Supabase-DB", async () => {
        const { data, error } = await supabaseAdmin
          .from("bookings")
          .insert({
            creator_id,
            package_id: package_id || null,
            brand_email,
            brand_name,
            campaign_brief,
            budget: budget,
            amount_usd: budget,
            platform_fee_usd: platform_fee,
            status: "pending_payment",
            idempotency_key: idempotency_key,
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            throw new Error("Duplicate request detected. This booking was already submitted.");
          }
          throw error;
        }
        return data;
      });

      return NextResponse.json({ success: true, message: "Booking created successfully", booking }, { status: 201 });
      
    } catch (error: any) {
      if (error.message.includes("Duplicate request")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes("temporarily unavailable")) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      throw error;
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
