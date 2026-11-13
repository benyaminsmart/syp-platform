import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Creator {
  id: string;
  platform: 'instagram' | 'youtube';
  username: string;
  display_name: string;
  profile_url: string;
  avatar_url?: string;
  bio_ai?: string;
  category: string;
  tags: string[];
  country_code: string;
  followers_count: number;
  engagement_rate: number;
  status: 'unclaimed' | 'pending_claim' | 'claimed' | 'verified';
}
