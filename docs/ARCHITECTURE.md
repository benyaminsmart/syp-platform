# SYP Architecture

## High-Level
Browser -> Next.js (App Router) -> Supabase (PostgreSQL + Auth)
                                  -> Groq API (AI)
                                  -> Cloudflare R2 (Storage)

## Key Decisions
- RLS: Row Level Security on all tables
- Rate Limiting: In-memory (dev) / Upstash Redis (prod)
- AI Cache: File-based cache to reduce Groq costs
- Circuit Breaker: Prevents cascading failures
- Async Batching: Parallel AI processing
