import os, re, json, requests
from dotenv import load_dotenv
from groq import Groq

load_dotenv(dotenv_path="../.env")
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def save_to_supabase(record: dict):
    url = f"{SUPABASE_URL}/rest/v1/creators?on_conflict=platform,username"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"}
    res = requests.post(url, headers=headers, json=record)
    res.raise_for_status()

def generate_creator_profile(platform: str, username: str, display_name: str, raw_bio: str, followers: int, country: str = "AE"):
    profile_url = f"https://instagram.com{username}" if platform == "instagram" else f"https://youtube.com@{username}"
    prompt = f'Return ONLY raw JSON object (no markdown) for {platform} creator {display_name} (@{username}), bio: "{raw_bio}", followers: {followers}, country: {country}. Keys: "bio_ai" (2-sentence English brand bio), "category" (ONE of: Tech & AI, Lifestyle, Food & Dining, Fitness & Health, Business & Finance, Travel, Beauty & Fashion, Entertainment), "tags" (array of 5 lowercase English keywords), "invite_dm" (short friendly English DM inviting them to claim their free profile on SYP — Rule Your Reach. and get a Verified Badge by sharing a story).'
    
    # مدل رسمی و جدید Groq برای جایگزینی مدل‌های منسوخ شده
    model_name = "openai/gpt-oss-20b"
    print(f"🤖 Using AI Model: {model_name}")
    
    try:
        chat = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}], 
            model=model_name, 
            temperature=0.3,
            max_tokens=600
        )
    except Exception as e:
        print(f"❌ API Error: {e}")
        return

    raw_text = chat.choices[0].message.content
    json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if not json_match:
        print("❌ AI returned invalid JSON format.")
        return
        
    ai_data = json.loads(json_match.group(0))
    
    record = {
        "platform": platform.lower(), "username": username.lower().strip("@"), 
        "display_name": display_name, "profile_url": profile_url, 
        "bio_original": raw_bio, "bio_ai": ai_data.get("bio_ai", raw_bio), 
        "category": ai_data.get("category", "General"), "tags": ai_data.get("tags", []), 
        "country_code": country.upper(), "followers_count": followers, "status": "unclaimed"
    }
    save_to_supabase(record)
    print(f"\n✅ Saved: {display_name} (@{username}) -> [{record['category']}]")
    print(f"📝 AI Bio: {record['bio_ai']}")
    print(f"📩 Ready DM:\n{ai_data.get('invite_dm')}\n" + "-"*40)

if __name__ == "__main__":
    generate_creator_profile("instagram", "dubaitech_demo", "Dubai Tech Lab", "Reviewing the latest AI gadgets, smartphones & smart home tech in UAE", 45000, "AE")
