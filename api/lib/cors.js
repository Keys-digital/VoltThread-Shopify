function getAllowedOrigin(requestOrigin) {
    const allowedOrigin = process.env.ALLOWED_ORIGIN;

    // If not set, allow everything (dev-safe, Shopify-safe fallback)
    if (!allowedOrigin) return requestOrigin || "*";

    // If no origin (browser direct test / curl), allow but don't break API
    if (!requestOrigin) return allowedOrigin;

    // Allow only configured origin
    return requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin;
}

export function corsHeaders(requestOrigin) {
    return {
        "Access-Control-Allow-Origin": getAllowedOrigin(requestOrigin),
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Vary": "Origin"
    };
}

export function jsonResponse(request, data, status = 200) {
    const origin = request.headers.get("origin");

    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json"
        }
    });
}

export function optionsResponse(request) {
    const origin = request.headers.get("origin");

    return new Response(null, {
        status: 204,
        headers: {
            ...corsHeaders(origin),
            "Content-Length": "0"
        }
    });
}