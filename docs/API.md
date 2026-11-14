# API Reference

## Public Endpoints
- GET /api/creators - List creators
- POST /api/claim - Submit claim
- POST /api/claim/generate-code - Generate code

## Creator Endpoints
- POST /api/activation/pay - Pay 500 AED
- POST /api/upload/avatar - Upload avatar (max 2MB)
- POST /api/kyc/submit - Submit KYC
- POST /api/consent - Accept ToS

## Admin Endpoints
- POST /api/admin/approve-claim
- GET /api/admin/reports
- GET /api/admin/slow-queries
- POST /api/admin/resolve-dispute
- POST /api/admin/process-refund

## Infrastructure
- GET /api/health - Health check
- GET /api/csrf - Get CSRF token
- POST /api/webhooks/stripe - Stripe webhook
