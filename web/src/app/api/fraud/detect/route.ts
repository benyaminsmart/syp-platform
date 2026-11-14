import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// قوانین تشخیص تراکنش مشکوک
const RULES = {
  HIGH_AMOUNT_THRESHOLD: 50000, // ۵۰,۰۰۰ دلار
  FREQUENCY_WINDOW_HOURS: 24,   // پنجره ۲۴ ساعته
  MAX_TRANSACTIONS_PER_WINDOW: 5, // حداکثر ۵ تراکنش در ۲۴ ساعت
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transaction_id } = body;

    if (!transaction_id) {
      return NextResponse.json({ error: "Missing transaction_id" }, { status: 400 });
    }

    // دریافت اطلاعات تراکنش
    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const alerts = [];

    // قانون ۱: مبلغ بسیار بالا
    if (tx.amount >= RULES.HIGH_AMOUNT_THRESHOLD) {
      alerts.push({
        reason: `High amount: ${tx.amount} exceeds threshold of ${RULES.HIGH_AMOUNT_THRESHOLD}`,
        severity: "high",
      });
    }

    // قانون ۲: تعداد زیاد تراکنش در بازه زمانی کوتاه
    const windowStart = new Date(Date.now() - RULES.FREQUENCY_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const { data: recentTxs } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("brand_email", tx.brand_email)
      .gte("created_at", windowStart);

    if (recentTxs && recentTxs.length >= RULES.MAX_TRANSACTIONS_PER_WINDOW) {
      alerts.push({
        reason: `Frequency: ${recentTxs.length} transactions in ${RULES.FREQUENCY_WINDOW_HOURS} hours (max allowed: ${RULES.MAX_TRANSACTIONS_PER_WINDOW})`,
        severity: "medium",
      });
    }

    // ثبت هشدارها
    if (alerts.length > 0) {
      const records = alerts.map(alert => ({
        transaction_id: tx.id,
        brand_email: tx.brand_email,
        amount: tx.amount,
        reason: alert.reason,
        severity: alert.severity,
        status: "open",
      }));

      const { error } = await supabaseAdmin
        .from("suspicious_transactions")
        .insert(records);

      if (error) throw error;
    }

    return NextResponse.json({ 
      success: true, 
      alerts_triggered: alerts.length,
      alerts 
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
