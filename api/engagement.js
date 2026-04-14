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
  return jsonResponse(request, { success: false, message: "Too many requests. Please try again later." }, 429);
}

function isAllowedOrigin(request) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = request.headers.get("origin");
  const isProduction = process.env.NODE_ENV === "production";

  if (!allowedOrigin) return !isProduction;
  if (!origin) return !isProduction;

  return origin === allowedOrigin;
}

function isNumericArticleId(articleId) {
  return /^\d+$/.test(articleId);
}

function normalizeChannel(channel) {
  return String(channel || "").trim().toLowerCase();
}

const VALID_CHANNELS = ["copy", "whatsapp", "facebook", "twitter"];

function parseShares(shares = {}) {
  return {
    copy: Number.parseInt(shares.copy, 10) || 0,
    whatsapp: Number.parseInt(shares.whatsapp, 10) || 0,
    facebook: Number.parseInt(shares.facebook, 10) || 0,
    twitter: Number.parseInt(shares.twitter, 10) || 0
  };
}

export async function OPTIONS(request) {
  return optionsResponse(request);
}

/* -------------------- GET SHARES -------------------- */
export async function GET(request) {
  if (request.method !== "GET") return methodNotAllowed(request);
  if (!isAllowedOrigin(request)) return forbidden(request);

  const ip = getClientIp(request);
  if (!(await checkRateLimit(ip, "engagement"))) return tooManyRequests(request);

  try {
    const { searchParams } = new URL(request.url);
    const articleId = String(searchParams.get("articleId") || "").trim();

    if (!articleId) return badRequest(request, "articleId is required");
    if (!isNumericArticleId(articleId)) {
      return badRequest(request, "articleId must be numeric");
    }

    const key = `article:${articleId}:shares`;
    const shares = (await redis.hgetall(key)) ?? {};

    const { copy, whatsapp, facebook, twitter } = parseShares(shares);

    const totalShares = copy + whatsapp + facebook + twitter;

    return jsonResponse(request, {
      success: true,
      data: {
        articleId,
        copyShares: copy,
        whatsappShares: whatsapp,
        facebookShares: facebook,
        twitterShares: twitter,
        totalShares
      }
    });
  } catch (error) {
    return jsonResponse(request, {
      success: false,
      message: "Failed to fetch share counts",
      error: error.message
    }, 500);
  }
}

/* -------------------- POST SHARE -------------------- */
export async function POST(request) {
  if (request.method !== "POST") return methodNotAllowed(request);
  if (!isAllowedOrigin(request)) return forbidden(request);

  const ip = getClientIp(request);
  if (!(await checkRateLimit(ip, "engagement"))) return tooManyRequests(request);

  try {
    const body = await request.json().catch(() => null);
    if (!body) return badRequest(request, "Invalid JSON body");

    const articleId = String(body?.articleId || "").trim();
    const channel = normalizeChannel(body?.channel);

    if (!articleId) return badRequest(request, "articleId is required");
    if (!isNumericArticleId(articleId)) {
      return badRequest(request, "articleId must be numeric");
    }

    if (!VALID_CHANNELS.includes(channel)) {
      return badRequest(
        request,
        'channel must be one of: "copy", "whatsapp", "facebook", "twitter"'
      );
    }

    const key = `article:${articleId}:shares`;

    // atomic increment
    await redis.hincrby(key, channel, 1);

    const shares = (await redis.hgetall(key)) ?? {};
    const { copy, whatsapp, facebook, twitter } = parseShares(shares);

    const totalShares = copy + whatsapp + facebook + twitter;

    return jsonResponse(request, {
      success: true,
      message: "Share recorded",
      data: {
        articleId,
        copyShares: copy,
        whatsappShares: whatsapp,
        facebookShares: facebook,
        twitterShares: twitter,
        totalShares
      }
    });
  } catch (error) {
    return jsonResponse(request, {
      success: false,
      message: "Failed to update share counts",
      error: error.message
    }, 500);
  }
}