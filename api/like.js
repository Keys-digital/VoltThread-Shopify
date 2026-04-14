import { jsonResponse, optionsResponse } from "./lib/cors.js";
import { getClientIp, checkRateLimit } from "./lib/rate-limit.js";
import { redis } from "./lib/redis.js";

function badRequest(request, message) {
  return jsonResponse(request, { success: false, message }, 400);
}

function forbidden(request, message = "Unauthorized origin") {
  return jsonResponse(request, { success: false, message }, 403);
}

function methodNotAllowed(request) {
  return jsonResponse(request, { success: false, message: "Method not allowed" }, 405);
}

function tooManyRequests(request) {
  return jsonResponse(
    request,
    { success: false, message: "Too many requests. Please try again later." },
    429
  );
}

/* ---------------- ORIGIN CHECK ---------------- */

function isAllowedOrigin(request) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = request.headers.get("origin");
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) return true;
  if (!allowedOrigin || !origin) return false;

  return origin === allowedOrigin;
}

/* ---------------- HELPERS ---------------- */

function sanitizeAction(action) {
  return String(action || "").trim().toLowerCase();
}

function isNumericArticleId(articleId) {
  return /^\d+$/.test(articleId);
}

/* ---------------- OPTIONS ---------------- */

export async function OPTIONS(request) {
  return optionsResponse(request);
}

/* ---------------- GET LIKES ---------------- */

export async function GET(request) {
  if (request.method !== "GET") return methodNotAllowed(request);
  if (!isAllowedOrigin(request)) return forbidden(request);

  const ip = getClientIp(request);
  if (!(await checkRateLimit(ip, "like"))) return tooManyRequests(request);

  try {
    const { searchParams } = new URL(request.url);
    const articleId = String(searchParams.get("articleId") || "").trim();

    if (!articleId) return badRequest(request, "articleId is required");
    if (!isNumericArticleId(articleId)) {
      return badRequest(request, "articleId must be numeric");
    }

    const key = `article:${articleId}:likes`;
    const storedLikes = await redis.get(key);
    const totalLikes = Number.parseInt(storedLikes, 10) || 0;

    return jsonResponse(request, {
      success: true,
      data: { articleId, totalLikes }
    });
  } catch (error) {
    return jsonResponse(
      request,
      {
        success: false,
        message: "Failed to fetch like count",
        error: error.message
      },
      500
    );
  }
}

/* ---------------- POST LIKE ---------------- */

export async function POST(request) {
  if (request.method !== "POST") return methodNotAllowed(request);
  if (!isAllowedOrigin(request)) return forbidden(request);

  const ip = getClientIp(request);
  if (!(await checkRateLimit(ip, "like"))) return tooManyRequests(request);

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequest(request, "Invalid JSON body");
    }

    const articleId = String(body?.articleId || "").trim();
    const action = sanitizeAction(body?.action);

    if (!articleId) return badRequest(request, "articleId is required");
    if (!isNumericArticleId(articleId)) {
      return badRequest(request, "articleId must be numeric");
    }

    if (!["like", "unlike"].includes(action)) {
      return badRequest(request, 'action must be "like" or "unlike"');
    }

    const key = `article:${articleId}:likes`;
    let totalLikes;

    if (action === "like") {
      totalLikes = await redis.incr(key);
    } else {
      totalLikes = await redis.eval(
        `
        local current = tonumber(redis.call("GET", KEYS[1]) or "0")
        if current <= 0 then
          return 0
        end
        return redis.call("DECR", KEYS[1])
        `,
        [key]
      );
    }

    return jsonResponse(request, {
      success: true,
      message: action === "like" ? "Article liked" : "Article unliked",
      data: {
        articleId,
        totalLikes: Number(totalLikes) || 0
      }
    });
  } catch (error) {
    return jsonResponse(
      request,
      {
        success: false,
        message: "Failed to update like count",
        error: error.message
      },
      500
    );
  }
}