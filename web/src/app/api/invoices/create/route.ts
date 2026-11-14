import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// نرخ مالیات بر اساس ارز
const TAX_RATES: Record<string, number> = {
  AED: 5.00,   // امارات ۵٪
  USD: 0.00,   // آمریکا (بدون مالیات)
  EUR: 20.00,  // اروپا ۲۰٪
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const body = await req.json();
    const { transaction_id, currency = "AED" } = body;

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

    // محاسبه مالیات
    const taxRate = TAX_RATES[currency] || 0;
    const taxAmount = (tx.amount * taxRate) / 100;
    const totalAmount = tx.amount + taxAmount;

    // تولید شماره فاکتور یکتا (مثلاً INV-2024-0001)
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // ثبت فاکتور
    const { data: invoice, error } = await supabaseAdmin
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        transaction_id: tx.id,
        booking_id: tx.booking_id,
        brand_email: tx.brand_email,
        amount: tx.amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency,
        tax_rate: taxRate,
        status: "issued",
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // ۳۰ روز مهلت
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      invoice: {
        ...invoice,
        tax_breakdown: {
          rate: `${taxRate}%`,
          tax: taxAmount,
          subtotal: tx.amount,
          total: totalAmount
        }
      } 
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
