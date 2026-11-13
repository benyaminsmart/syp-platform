"use client";

import { useEffect, useState } from "react";
import { supabase, Creator } from "@/lib/supabase";
import { CreatorCard } from "@/components/CreatorCard";
import { Search, Sparkles } from "lucide-react";

const CATEGORIES = ["All", "Tech & AI", "Lifestyle", "Food & Dining", "Fitness & Health", "Business & Finance", "Travel", "Beauty & Fashion", "Entertainment"];

export default function HomePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    async function fetchCreators() {
      setLoading(true);
      let query = supabase.from("creators").select("*").order("followers_count", { ascending: false }).limit(60);
      if (platform !== "all") query = query.eq("platform", platform);
      if (category !== "All") query = query.eq("category", category);
      if (search.trim()) {
        query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,bio_ai.ilike.%${search}%,country_code.ilike.%${search}%`);
      }
      const { data } = await query;
      if (data) setCreators(data);
      setLoading(false);
    }
    fetchCreators();
  }, [platform, category, search]);

  return (
    <main className="max-w-6xl mx-auto px-4 pb-20">
      <section className="pt-10 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-cyan-400/25 text-cyan-300 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          AI-Powered Global Creator Marketplace
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-3 cyber-text">
          Rule Your Reach.
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-7">
          Discover, compare, and book Instagram & YouTube creators worldwide — structured and verified by AI.
        </p>

        <div className="max-w-2xl mx-auto glass-card rounded-2xl p-2 flex items-center gap-2 shadow-2xl shadow-blue-950/50">
          <Search className="w-5 h-5 text-cyan-400 ml-3 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by creator, niche, keyword, or country (e.g. AE, Tech)..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none py-2"
          />
        </div>

        <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
          {["all", "instagram", "youtube"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition cursor-pointer ${
                platform === p
                  ? "cyber-gradient text-slate-950 shadow-lg shadow-cyan-500/25"
                  : "glass-card text-slate-300 hover:text-white"
              }`}
            >
              {p === "all" ? "All Platforms" : p}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-start sm:justify-center gap-2 mt-3 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition cursor-pointer ${
                category === cat
                  ? "bg-cyan-400/20 border border-cyan-400/50 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-white bg-white/5"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section id="creators">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Creator Directory</h2>
          <span className="text-xs text-cyan-400">{creators.length} Profiles Found</span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Loading AI-indexed creators...</div>
        ) : creators.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-slate-400 text-sm">
            No creators matched your filter. Try clearing search or run the AI engine to add more!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
