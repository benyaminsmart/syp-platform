import { Creator } from "@/lib/supabase";
import { CheckCircle2, ExternalLink, Crown, Sparkles } from "lucide-react";

export function CreatorCard({ creator }: { creator: Creator }) {
  const isVerified = creator.status === "verified" || creator.status === "claimed";
  const formattedFollowers =
    creator.followers_count >= 1000000
      ? `${(creator.followers_count / 1000000).toFixed(1)}M`
      : creator.followers_count >= 1000
      ? `${(creator.followers_count / 1000).toFixed(1)}K`
      : creator.followers_count;

  return (
    <div className={`glass-card rounded-2xl p-5 flex flex-col justify-between ${!isVerified ? "border-dashed border-cyan-500/30" : ""}`}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full cyber-gradient p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-cyan-300 text-sm">
                {creator.display_name.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-sm">{creator.display_name}</h3>
                {isVerified && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
              </div>
              <p className="text-xs text-slate-400">@{creator.username} • {creator.country_code}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
            creator.platform === "instagram"
              ? "bg-pink-500/15 text-pink-400 border-pink-500/30"
              : "bg-red-500/15 text-red-400 border-red-500/30"
          }`}>
            {creator.platform}
          </span>
        </div>

        <div className="mt-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-blue-500/10 text-cyan-300 border border-cyan-500/20">
            <Sparkles className="w-3 h-3" /> {creator.category}
          </span>
        </div>

        <p className="text-xs text-slate-300 mt-3 leading-relaxed line-clamp-3">
          {creator.bio_ai || "Verified social media creator profile on SYP."}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-4 p-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-center">
          <div>
            <div className="text-xs font-extrabold text-white">{formattedFollowers}</div>
            <div className="text-[10px] text-slate-400">{creator.platform === "youtube" ? "Subscribers" : "Followers"}</div>
          </div>
          <div>
            <div className={`text-xs font-extrabold ${isVerified ? "text-cyan-400" : "text-amber-400"}`}>
              {isVerified ? "Verified" : "Unclaimed"}
            </div>
            <div className="text-[10px] text-slate-400">Status</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
        {isVerified ? (
          <button className="w-full py-2 rounded-xl cyber-gradient text-slate-950 font-bold text-xs hover:opacity-90 transition cursor-pointer">
            Book Promo
          </button>
        ) : (
          <a
            href={`/claim/${creator.username}`}
            className="w-full py-2 rounded-xl bg-cyan-400/15 border border-cyan-400/50 text-cyan-300 font-bold text-xs hover:bg-cyan-400/25 transition flex items-center justify-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" /> Claim Profile
          </a>
        )}
        <a
          href={creator.profile_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-xl border border-white/15 text-xs text-slate-300 hover:text-white hover:border-cyan-400/40 transition flex items-center gap-1 shrink-0"
        >
          Visit <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
