"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // در اینجا خطا را به یک سرویس مانیتورینگ (مثل Sentry) در فاز ۶ ارسال می‌کنیم
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#060D1A] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-red-500/30 text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-sm text-slate-400">
          We encountered an unexpected error. Our team has been notified.
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 px-6 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold flex items-center justify-center gap-2 mx-auto hover:bg-cyan-400 transition"
        >
          <RefreshCcw className="w-4 h-4" /> Try Again
        </button>
      </div>
    </div>
  );
}
