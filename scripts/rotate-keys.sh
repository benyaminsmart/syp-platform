#!/bin/bash
echo "🔐 SYP - Key Rotation Guide"
echo "1. GROQ_API_KEY - every 90 days"
echo "2. SUPABASE_SERVICE_ROLE_KEY - every 180 days"
echo "3. CSRF_SECRET - every 90 days"
echo "4. ADMIN_SECRET_KEY - every 90 days"
echo ""
echo "To rotate: run ./scripts/rotate-keys.sh and follow instructions."
