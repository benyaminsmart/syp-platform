import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    // احراز هویت ادمین
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // دریافت تمام تراکنش‌های موفق
    const { data: transactions, error } = await supabaseAdmin
      .from("transactions")
      .select("amount, platform_fee, transaction_type, status, currency, created_at")
      .eq("status", "completed");

    if (error) throw error;

    // ۱. محاسبه کل درآمد پلتفرم
    const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.platform_fee || 0), 0);

    // ۲. درآمد به تفکیک نوع تراکنش
    const revenueByType: Record<string, number> = {};
    transactions.forEach(tx => {
      const type = tx.transaction_type || "unknown";
      revenueByType[type] = (revenueByType[type] || 0) + (tx.platform_fee || 0);
    });

    // ۳. درآمد ماهانه (۶ ماه اخیر)
    const monthlyRevenue: Record<string, number> = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    transactions.forEach(tx => {
      const txDate = new Date(tx.created_at);
      if (txDate >= sixMonthsAgo) {
        const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (tx.platform_fee || 0);
      }
    });

    // ۴. تعداد تراکنش‌ها به تفکیک نوع
    const countByType: Record<string, number> = {};
    transactions.forEach(tx => {
      const type = tx.transaction_type || "unknown";
      countByType[type] = (countByType[type] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      summary: {
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        total_transactions: transactions.length,
        currency: "USD",
      },
      revenue_by_type: revenueByType,
      monthly_revenue: monthlyRevenue,
      count_by_type: countByType,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
