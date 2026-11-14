import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export async function POST(req: Request) {
  try {
    // 1. دریافت ۱۰ ایمیل از صف
    const { data: emails, error: fetchError } = await supabaseAdmin
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .limit(10);

    if (fetchError) throw fetchError;

    if (!emails || emails.length === 0) {
      return NextResponse.json({ success: true, message: "No pending emails." }, { status: 200 });
    }

    let sent = 0;
    let failed = 0;

    // 2. ارسال هر ایمیل
    for (const email of emails) {
      try {
        if (!process.env.RESEND_API_KEY) {
          // در حالت تست (بدون کلید واقعی)، فقط وضعیت را آپدیت می‌کنیم
          console.log(`[TEST MODE] Would send email to ${email.to_email}`);
        } else {
          await resend.emails.send({
            from: "SYP <noreply@yourdomain.com>",
            to: email.to_email,
            subject: email.subject,
            html: email.html_body,
          });
        }
        
        await supabaseAdmin.from("email_queue").update({ status: "sent" }).eq("id", email.id);
        sent++;
      } catch (err: any) {
        console.error(`Failed to send email to ${email.to_email}:`, err.message);
        await supabaseAdmin.from("email_queue").update({ status: "failed" }).eq("id", email.id);
        failed++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${emails.length} emails. Sent: ${sent}, Failed: ${failed}.` 
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
