# VoltThread Shopify Engagement API

Vercel serverless API for Shopify article engagement (likes & shares), powered by Upstash for fast, atomic counters.


## Endpoints

### Likes API
GET /api/like?articleId=123456789

Returns:

totalLikes
POST /api/like

Like an article:

{
  "articleId": "123456789",
  "action": "like"
}

Unlike an article:

{
  "articleId": "123456789",
  "action": "unlike"
}

### Shares API
GET /api/engagement?articleId=123456789

Returns:

copyShares
whatsappShares
facebookShares
twitterShares
totalShares
POST /api/engagement

Increment a share:

{
  "articleId": "123456789",
  "channel": "whatsapp"
}

Allowed channels:

copy
whatsapp
facebook
twitter

### Data Storage
Primary storage: Upstash Redis

Redis keys:

article:{articleId}:likes
article:{articleId}:shares

Examples:

article:123456789:likes
article:123456789:shares

 ### Share hash structure

Stored as Redis hash fields:

copy
whatsapp
facebook
twitter

Total shares are computed as:

copy + whatsapp + facebook + twitter


## Environment Variables
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
ALLOWED_ORIGIN=https://your-storefront-domain.com
Optional (future Shopify sync)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxx

✨ What this gives you
⚡ Fast like & share tracking
🔒 Atomic Redis updates (no race conditions)
📊 Real-time engagement counters
🚀 Better performance than Shopify metafields
🧠 Safe under concurrent traffic


## Important Notes
Redis ensures atomic updates
Frontend safeguards (like localStorage) still help reduce spam clicks
CORS is not security
For production-grade protection, consider:
Redis-based rate limiting (already implemented)
Request signing (optional)
Authentication layer (if needed)


## Project Structure
api/
  like.js              # Likes endpoint
  engagement.js        # Shares endpoint

lib/
  cors.js              # CORS helpers
  redis.js             # Upstash Redis client
  rate-limit.js        # Rate limiting logic
  shopify.js           # Optional Shopify sync


## Local Development


Install dependencies:

npm install

Run locally:

vercel dev

## Deployment Steps
Push code to GitHub
Import repo into Vercel
Add environment variables
Deploy
Connect API to Shopify theme

## Frontend Usage
Like
fetch("/api/like", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    articleId,
    action: "like"
  })
});

Share
fetch("/api/engagement", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    articleId,
    channel: "whatsapp"
  })
});
## Next Improvements
Connect API to Shopify theme UI
Replace local counters fully with Redis-backed system
Add analytics dashboard endpoints
Optional: sync Redis → Shopify metafields
Optional: add auth for admin analytics

## Summary

This API provides a fast, scalable engagement system for Shopify, replacing fragile client-side counters with a Redis-backed atomic system ready for production traffic.