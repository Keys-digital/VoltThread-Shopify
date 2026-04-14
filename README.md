VoltThread Shopify Engagement API

Vercel serverless API for Shopify article likes and shares, powered by Shopify metafields.

📦 Endpoints
🔹 Likes API
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
🔹 Shares API
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
🧱 Data Storage (Shopify Metafields)

All values are stored as integers under the custom namespace:

custom.total_likes
custom.copy_shares
custom.whatsapp_shares
custom.facebook_shares
custom.twitter_shares
custom.total_shares
⚙️ Environment Variables
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxx
ALLOWED_ORIGIN=https://your-storefront-domain.com
🚀 What this gives you
GET /api/like → fetch total likes
POST /api/like → increment/decrement likes
GET /api/engagement → fetch share counts
POST /api/engagement → increment share counts
All data is persisted in Shopify article metafields
⚠️ Important Notes
This is a basic counter API — it does NOT prevent abuse.
You should keep frontend protection (e.g. localStorage) to prevent repeated likes from the same user.
For production-grade protection, consider:
IP rate limiting
user authentication
signed requests
📁 Project Structure
api/
  like.js          # Likes endpoint
  engagement.js    # Shares endpoint

lib/
  shopify.js       # Shopify GraphQL logic
  cors.js          # CORS helpers
🧪 Local Development
npm install
vercel dev
🚀 Deployment Steps
Push code to GitHub
Import repo into Vercel
Add environment variables
Deploy
Use your Vercel URL in Shopify theme JS
🔌 Frontend Integration (Example)
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

🔄 Next Steps
Connect this API to your Shopify theme
Replace localStorage-only counts with API-backed counts
Optionally add caching (Redis / Edge Config) for performance