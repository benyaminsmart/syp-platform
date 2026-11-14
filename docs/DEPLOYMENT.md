# Deployment Guide

## Prerequisites
- VPS (Hetzner CX32)
- Domain (.com or .social)
- Cloudflare account (free)

## Steps
1. Buy VPS and domain
2. Point domain to Cloudflare
3. SSH into VPS, install Docker
4. Clone repo from GitHub
5. Create .env with production secrets
6. Run docker-compose up -d
7. Setup UptimeRobot: monitor /api/health
8. Setup automated backup (cron + pg_dump)

## Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
