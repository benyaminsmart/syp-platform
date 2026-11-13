import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#060D1A] text-white flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-extrabold text-cyan-500">404</h1>
        <h2 className="text-2xl font-bold">Page Not Found</h2>
        <p className="text-slate-400 text-sm">The creator or page you are looking for does not exist.</p>
        <Link 
          href="/" 
          className="inline-block mt-4 px-6 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
