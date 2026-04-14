import { redis } from "./redis.js";
import { randomUUID } from "crypto";

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 30;

export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? randomUUID();
}

export async function checkRateLimit(ip, scope = "global", max = RATE_LIMIT_MAX) {
  try {
    const key = `rate_limit:${scope}:${ip}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }

    return current <= max;
  } catch (error) {
    // Fail open (don’t block users if Redis fails)
    return true;
  }
}