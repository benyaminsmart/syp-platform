import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// استفاده از کلید سرویس برای دور زدن محدودیت‌های RLS در ثبت رزرو
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// درصد کمیسیون پلتفرم (مثلاً 10٪)
const PLATFORM_FEE_PERCENTAGE = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { creator_id, package_id, brand_email, brand_name, campaign_brief, budget } = body;

    // 1. اعتبارسنجی ورودی‌ها
    if (!creator_id || !brand_email || !brand_name || !campaign_brief || !budget) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const amount = parseFloat(budget);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid budget amount" }, { status: 400 });
    }

    // 2. محاسبه کارمزد پلتفرم و مبلغ نهایی
    const platform_fee = (amount * PLATFORM_FEE_PERCENTAGE) / 100;
    
    // 3. ثبت رزرو در دیتابیس با وضعیت pending_payment
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        creator_id,
        package_id: package_id || null,
        brand_email,
        brand_name,
        campaign_brief,
        budget: amount,
        amount_usd: amount,
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
    console.error("Booking API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
