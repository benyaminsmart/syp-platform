import { NextResponse } from "next/server";
import Stripe from "stripe";

// کلید مخفی Stripe (در محیط واقعی باید در .env باشد)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2024-12-18.acacia" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_dummy";

export async function POST(req: Request) {
  try {
    // ۱. گرفتن امضای دیجیتال از هدر درخواست
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    // ۲. خواندن متن خام (Raw Body) برای بررسی امضا
    const body = await req.text();

    let event: Stripe.Event;

    // ۳. بررسی اصالت پیام با استفاده از امضای HMAC
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed:`, err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // ۴. پردازش رویدادهای معتبر
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`💰 Payment succeeded for amount: ${paymentIntent.amount}`);
      // اینجا در آینده دیتابیس را آپدیت می‌کنیم (تغییر وضعیت رزرو به in_escrow)
    } else {
      console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error("Webhook Handler Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
