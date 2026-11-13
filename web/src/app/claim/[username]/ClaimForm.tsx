"use client";
import { CheckCircle2 } from "lucide-react";

export function ClaimForm({ creator, initialCode }: { creator: any, initialCode: string }) {
  return (
    <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-slate-700 text-center text-white">
      <CheckCircle2 className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-2">Success!</h2>
      <p className="text-sm">Creator: <b>{creator.username}</b></p>
      <p className="text-sm">Code: <b>{initialCode}</b></p>
    </div>
  );
}
