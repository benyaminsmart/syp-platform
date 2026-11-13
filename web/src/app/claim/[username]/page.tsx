import { createClient } from "@supabase/supabase-js";
import { ClaimForm } from "./ClaimForm";
import { notFound } from "next/navigation";
import crypto from "crypto";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function ClaimProfilePage({ params }: Props) {
  const resolvedParams = await params;
  const username = resolvedParams.username;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("username", username)
    .single();

  if (!creator) {
    notFound();
  }

  const randomBytes = crypto.randomBytes(3).toString("hex").toUpperCase();
  const verificationCode = `SYP-${randomBytes}`;

  return (
    <div className="min-h-screen bg-[#060D1A] text-white p-6 flex items-center justify-center">
      <ClaimForm creator={creator} initialCode={verificationCode} />
    </div>
  );
}
