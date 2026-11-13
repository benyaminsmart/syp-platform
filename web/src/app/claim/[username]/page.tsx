"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, ShieldCheck, Copy, ArrowRight, Loader2 } from "lucide-react";

export default function ClaimProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [creator, setCreator] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchCreator() {
      // دریافت اطلاعات پروفایل فقط برای نمایش کد
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .eq("username", username)
        .single();

      if (data) {
        setCreator(data);
        // تولید کد یکتا
        const code = `SYP-VERIFY-${Math.floor(1000 + Math.random() * 9000)}`;
        setVerificationCode(code);
      }
      setLoading(false);
    }
    fetchCreator();
  }, [username]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(verificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitClaim = async () => {
    setSubmitting(true);
    setErrorMsg("");

    // دریافت اطلاعات کاربر لاگین شده
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("You must be logged in to submit a claim. (Auth system coming in Phase 4.2)");
      setSubmitting(false);
      return;
    }

    // ارسال درخواست به API امن ما
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_id: creator.id,
          user_id: user.id,
          verification_code: verificationCode,
        }),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to submit claim");

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#060D1A] text-white flex items-center justify-center">Loading...</div>;
  if (!creator) return <div className="min-h-screen bg-[#060D1A] text-white flex items-center justify-center">Creator not found.</div>;

  return (
    <div className="min-h-screen bg-[#060D1A] text-white p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-slate-700">
        
        {submitted ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-cyan-400 mx-auto" />
            <h2 className="text-2xl font-bold">Claim Submitted!</h2>
            <p className="text-sm text-slate-400">We are reviewing your proof. You will be notified once verified.</p>
            <button onClick={() => router.push("/")} className="mt-4 px-6 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold">Back to Home</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Claim Ownership</span>
            </div>
            <h1 className="text-2xl font-bold mb-1">Claim @{creator.username}</h1>
            <p className="text-xs text-slate-400 mb-6">Verify that you are the owner of this profile to unlock your Creator Dashboard.</p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase mb-2">Step 1: Copy your code</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-cyan-300 font-mono text-lg tracking-wider">{verificationCode}</code>
                  <button onClick={copyToClipboard} className="p-2 rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700 transition">
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase mb-2">Step 2: Post this to your Story</p>
                <p className="text-xs text-slate-300">Paste the code on your Instagram/YouTube story and take a screenshot. Then submit.</p>
              </div>

              <button
                onClick={handleSubmitClaim}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 hover:bg-cyan-400 transition mt-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Claim Request"}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
