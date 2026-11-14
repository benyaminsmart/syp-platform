import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // احراز هویت (فقط کاربران لاگین شده می‌توانند ایمیل در صف بگذارند)
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
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Missing required fields (to, subject, html)" }, { status: 400 });
    }

    // افزودن به صف ایمیل
    const { error: queueError } = await supabaseAdmin
      .from("email_queue")
      .insert({
        to_email: to,
        subject: subject,
        html_body: html,
        status: "pending",
      });

    if (queueError) throw queueError;

    return NextResponse.json({ success: true, message: "Email added to queue." }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
