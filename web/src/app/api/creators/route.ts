import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20");
    const platform = searchParams.get("platform");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let query = supabaseAdmin
      .from("creators")
      .select("*")
      .is("deleted_at", null)
      .order("followers_count", { ascending: false })
      .limit(limit);

    if (platform && platform !== "all") query = query.eq("platform", platform);
    if (category && category !== "All") query = query.eq("category", category);
    
    // استفاده از Full-Text Search (به جای ilike)
    if (search && search.trim()) {
      // تبدیل عبارت جستجو به فرمت tsquery (پشتیبانی از چند کلمه)
      const searchTerms = search.trim().split(/\s+/).join(" & ");
      query = query.textSearch("search_vector", searchTerms, { type: "websearch" });
    }

    if (cursor) {
      query = query.lt("followers_count", parseInt(cursor));
    }

    const { data, error } = await query;
    if (error) throw error;

    const nextCursor = data.length === limit ? data[data.length - 1].followers_count : null;

    return NextResponse.json({ success: true, creators: data, nextCursor }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
