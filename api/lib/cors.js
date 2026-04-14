function getAllowedOrigin(requestOrigin) {
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    const isProduction = process.env.NODE_ENV === "production";

    if (!allowedOrigin) {
        if (isProduction) {
            throw new Error("ALLOWED_ORIGIN must be set in production");
        }

        return "*";
    }

    if (!requestOrigin) {
        return isProduction ? "null" : allowedOrigin;
    }

    return requestOrigin === allowedOrigin ? requestOrigin : "null";
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