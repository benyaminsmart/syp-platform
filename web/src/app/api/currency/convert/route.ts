import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, from_currency, to_currency } = body;

    if (!amount || !from_currency || !to_currency) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // اگر ارزها یکسان باشند، نیازی به تبدیل نیست
    if (from_currency === to_currency) {
      return NextResponse.json({
        success: true,
        amount,
        from_currency,
        to_currency,
        converted_amount: amount,
        rate: 1,
      }, { status: 200 });
    }

    // دریافت نرخ تبدیل
    const { data: rate, error } = await supabaseAdmin
      .from("exchange_rates")
      .select("rate")
      .eq("from_currency", from_currency.toUpperCase())
      .eq("to_currency", to_currency.toUpperCase())
      .single();

    if (error || !rate) {
      return NextResponse.json({ 
        error: `Exchange rate not found for ${from_currency} -> ${to_currency}` 
      }, { status: 404 });
    }

    const convertedAmount = amount * rate.rate;

    return NextResponse.json({
      success: true,
      amount,
      from_currency: from_currency.toUpperCase(),
      to_currency: to_currency.toUpperCase(),
      rate: rate.rate,
      converted_amount: parseFloat(convertedAmount.toFixed(2)),
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
