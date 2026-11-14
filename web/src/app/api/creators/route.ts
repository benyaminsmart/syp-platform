import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/cache";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// فقط ستون‌هایی که کارت پروفایل به آن‌ها نیاز دارد
const CREATOR_CARD_FIELDS = "id, username, display_name, country_code, platform, category, bio_ai, followers_count, status, profile_url, avatar_url";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20");
    const platform = searchParams.get("platform");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const cacheKey = `creators:v2:${platform || 'all'}:${category || 'all'}:${search || 'none'}:${cursor || 'start'}:${limit}`;
    
    // 1. بررسی کش
    const cachedResult = await getCached<any>(cacheKey);
    if (cachedResult) {
      console.log(`✅ Cache HIT for key: ${cacheKey}`);
      return NextResponse.json(cachedResult, { status: 200 });
    }

    console.log(`🔍 Cache MISS for key: ${cacheKey}. Querying DB...`);

    // 2. کوئری با ستون‌های محدود (نه select *)
    let query = supabaseAdmin
      .from("creators")
      .select(CREATOR_CARD_FIELDS) // 👈 فقط ستون‌های لازم
      .is("deleted_at", null)
      .order("followers_count", { ascending: false })
      .limit(limit);

    if (platform && platform !== "all") query = query.eq("platform", platform);
    if (category && category !== "All") query = query.eq("category", category);

    if (search && search.trim()) {
      const searchTerms = search.trim().split(/\s+/).join(" & ");
      query = query.textSearch("search_vector", searchTerms, { type: "websearch" });
    }

    if (cursor) {
      query = query.lt("followers_count", parseInt(cursor));
    }

    const { data, error } = await query;
    if (error) throw error;

    const nextCursor = data.length === limit ? data[data.length - 1].followers_count : null;
    const result = { success: true, creators: data, nextCursor };

    await setCached(cacheKey, result, 60);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
