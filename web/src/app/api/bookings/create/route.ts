import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validators";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLATFORM_FEE_PERCENTAGE = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. اعتبارسنجی سختگیرانه با Zod
    const validation = bookingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid input data", 
        details: validation.error.format() 
      }, { status: 400 });
    }

    const { creator_id, package_id, brand_email, brand_name, campaign_brief, budget } = validation.data;

    // 2. محاسبه کارمزد پلتفرم
    const platform_fee = (budget * PLATFORM_FEE_PERCENTAGE) / 100;
    
    // 3. ثبت رزرو در دیتابیس
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
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: "Booking created successfully",
      booking: data 
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
