import os, re, json, requests, hashlib, asyncio, aiohttp
from dotenv import load_dotenv
from groq import Groq

dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ai_cache.json")

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def get_cache_key(platform, username, display_name, raw_bio):
    data = f"{platform}:{username}:{display_name}:{raw_bio}"
    return hashlib.md5(data.encode()).hexdigest()

async def save_to_supabase_async(session, record: dict):
    url = f"{SUPABASE_URL}/rest/v1/creators?on_conflict=platform,username"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    async with session.post(url, headers=headers, json=record) as response:
        if response.status >= 400:
            text = await response.text()
            raise Exception(f"DB Error: {text}")

async def generate_creator_profile_async(session, semaphore, cache, platform: str, username: str, display_name: str, raw_bio: str, followers: int, country: str = "AE"):
    async with semaphore:
        profile_url = f"https://instagram.com{username}" if platform == "instagram" else f"https://youtube.com@{username}"
        cache_key = get_cache_key(platform, username, display_name, raw_bio)

        if cache_key in cache:
            print(f"⚡ CACHE HIT for @{username}!")
            ai_data = cache[cache_key]
        else:
            print(f"🤖 CACHE MISS for @{username}. Calling AI...")
            prompt = f'Return ONLY raw JSON object (no markdown) for {platform} creator {display_name} (@{username}), bio: "{raw_bio}", followers: {followers}, country: {country}. Keys: "bio_ai" (2-sentence English brand bio), "category" (ONE of: Tech & AI, Lifestyle, Food & Dining, Fitness & Health, Business & Finance, Travel, Beauty & Fashion, Entertainment), "tags" (array of 5 lowercase English keywords), "invite_dm" (short friendly English DM inviting them to claim their free profile on SYP — Rule Your Reach. and get a Verified Badge by sharing a story).'

            model_name = "openai/gpt-oss-20b"
            try:
                loop = asyncio.get_event_loop()
                chat = await loop.run_in_executor(None, lambda: groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=model_name,
                    temperature=0.3,
                    max_tokens=600
                ))
            except Exception as e:
                print(f"❌ API Error for @{username}: {e}")
                return

            raw_text = chat.choices[0].message.content
            json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if not json_match:
                print(f"❌ Invalid JSON for @{username}")
                return

            ai_data = json.loads(json_match.group(0))
            cache[cache_key] = ai_data
            save_cache(cache)
            print(f"💾 Cached AI result for @{username}.")

        # محاسبه shard_key در کد (برای هماهنگی با دیتابیس)
        shard_key = f"{country.upper()}_{platform.lower()}"

        record = {
            "platform": platform.lower(), "username": username.lower().strip("@"),
            "display_name": display_name, "profile_url": profile_url,
            "bio_original": raw_bio, "bio_ai": ai_data.get("bio_ai", raw_bio),
            "category": ai_data.get("category", "General"), "tags": ai_data.get("tags", []),
            "country_code": country.upper(), "followers_count": followers, "status": "unclaimed",
            "shard_key": shard_key
        }

        try:
            await save_to_supabase_async(session, record)
            print(f"✅ Saved: @{username} -> [{record['category']}] (Shard: {shard_key})")
        except Exception as e:
            print(f"❌ Failed to save @{username}: {e}")

async def main():
    test_profiles = [
        {"platform": "instagram", "username": f"shard_test_{i}", "display_name": f"Shard Test {i}", "raw_bio": f"Testing sharding {i}", "followers": i * 1000, "country": "AE" if i % 2 == 0 else "US"}
        for i in range(1, 6)
    ]

    cache = load_cache()
    semaphore = asyncio.Semaphore(3)

    async with aiohttp.ClientSession() as session:
        tasks = [
            generate_creator_profile_async(
                session, semaphore, cache,
                p["platform"], p["username"], p["display_name"], p["raw_bio"], p["followers"], p["country"]
            )
            for p in test_profiles
        ]
        await asyncio.gather(*tasks)

    print("\n🎉 ALL SHARDING TESTS COMPLETED!")

if __name__ == "__main__":
    asyncio.run(main())
