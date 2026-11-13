import Link from "next/link";
import { UserX } from "lucide-react";

export default function ClaimNotFound() {
  return (
    <div className="min-h-screen bg-[#060D1A] text-white flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-slate-700">
        <UserX className="w-16 h-16 text-cyan-500 mx-auto" />
        <h1 className="text-2xl font-bold">Profile Not Found</h1>
        <p className="text-slate-400 text-sm">
          The creator you are looking for does not exist in our database. It might have been removed or the username is incorrect.
        </p>
        <Link 
          href="/" 
          className="inline-block mt-4 px-6 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition"
        >
          Back to Explore
        </Link>
      </div>
    </div>
  );
}
