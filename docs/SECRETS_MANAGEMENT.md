# Secrets Management

## Rules
- NEVER commit secrets to Git
- ALWAYS use .env.local for dev
- ALWAYS use env vars for production
- ROTATE keys every 90-180 days

## Secrets
- NEXT_PUBLIC_SUPABASE_URL (public)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (180 days)
- SUPABASE_SERVICE_ROLE_KEY (180 days)
- GROQ_API_KEY (90 days)
- CSRF_SECRET (90 days)
- ADMIN_SECRET_KEY (90 days)

## Rotation
Run: ./scripts/rotate-keys.sh
