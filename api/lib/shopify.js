const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
  throw new Error("Missing Shopify environment variables.");
}

const ADMIN_API_URL = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2025-01/graphql.json`;

// 🔹 Simple in-memory cache (short-lived)
const cache = new Map();
const CACHE_TTL = 3000; // 3 seconds

async function shopifyFetch(query, variables = {}) {
  const res = await fetch(ADMIN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await res.json();

  if (!res.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors || json));
  }

  return json.data;
}

function articleGid(articleId) {
  return `gid://shopify/Article/${articleId}`;
}

function normalizeInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

// 🔹 Fetch only needed metafields
export async function getArticleEngagement(articleId) {
  const cacheKey = `article:${articleId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const query = `
    query GetArticleMetafields($id: ID!) {
      article(id: $id) {
        metafields(identifiers: [
          { namespace: "custom", key: "total_likes" },
          { namespace: "custom", key: "copy_shares" },
          { namespace: "custom", key: "whatsapp_shares" },
          { namespace: "custom", key: "facebook_shares" },
          { namespace: "custom", key: "twitter_shares" },
          { namespace: "custom", key: "total_shares" }
        ]) {
          key
          value
        }
      }
    }
  `;

  const data = await shopifyFetch(query, { id: articleGid(articleId) });

  const metafields = data.article?.metafields || [];

  const map = Object.fromEntries(
    metafields.map(mf => [mf.key, normalizeInt(mf.value)])
  );

  const result = {
    articleId: String(articleId),
    totalLikes: map.total_likes || 0,
    copyShares: map.copy_shares || 0,
    whatsappShares: map.whatsapp_shares || 0,
    facebookShares: map.facebook_shares || 0,
    twitterShares: map.twitter_shares || 0,
    totalShares: map.total_shares || 0
  };

  cache.set(cacheKey, { data: result, ts: Date.now() });

  return result;
}

// 🔹 Retry wrapper (reduces race collision probability)
async function retry(fn, retries = 3) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise(r => setTimeout(r, 100));
    }
  }

  throw lastError;
}

export async function updateArticleEngagement(articleId, action, channel = null) {
  return retry(async () => {
    const current = await getArticleEngagement(articleId);

    const next = { ...current };

    // 🔹 Normalize inputs
    action = action?.toLowerCase();
    channel = channel?.toLowerCase();

    if (action === "like") {
      next.totalLikes += 1;
    } else if (action === "unlike") {
      next.totalLikes = Math.max(0, next.totalLikes - 1);
    } else if (action === "share") {
      next.totalShares += 1;

      if (channel === "copy") next.copyShares += 1;
      else if (channel === "whatsapp") next.whatsappShares += 1;
      else if (channel === "facebook") next.facebookShares += 1;
      else if (channel === "twitter") next.twitterShares += 1;
      else throw new Error("Invalid share channel.");
    } else {
      throw new Error("Invalid action.");
    }

    const mutation = `
      mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors {
            field
            message
          }
        }
      }
    `;

    const ownerId = articleGid(articleId);

    const metafields = [
      ["total_likes", next.totalLikes],
      ["copy_shares", next.copyShares],
      ["whatsapp_shares", next.whatsappShares],
      ["facebook_shares", next.facebookShares],
      ["twitter_shares", next.twitterShares],
      ["total_shares", next.totalShares]
    ].map(([key, value]) => ({
      ownerId,
      namespace: "custom",
      key,
      type: "number_integer",
      value: String(value)
    }));

    const data = await shopifyFetch(mutation, { metafields });

    const userErrors = data.metafieldsSet?.userErrors || [];

    if (userErrors.length > 0) {
      throw new Error(JSON.stringify(userErrors));
    }

    // 🔹 Clear cache to avoid stale reads
    cache.delete(`article:${articleId}`);

    return next;
  });
}