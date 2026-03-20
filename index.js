/**
 * DevSuite Unified Worker
 * Handles Redirect Trace API and serves Static Assets from /client/dist
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight for the whole Worker
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. Route: Redirect Trace API (Streaming)
    if (url.pathname === "/api/trace-stream") {
      return handleTraceStream(request, corsHeaders);
    }

    // 3. FALLBACK: Serve Static Assets (React App)
    // This looks into the directory defined in your wrangler.toml [assets] block
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response("Asset Not Found", { status: 404 });
    }
  },
};

/**
 * Logic for the Redirect Trace streaming tool
 */
async function handleTraceStream(request, corsHeaders) {
  const url = new URL(request.url);
  const targetUrls = JSON.parse(decodeURIComponent(url.searchParams.get("urls") || "[]"));
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      const traceTask = async (targetUrl) => {
        try {
          // Cloudflare fetch has built-in SSRF protection for edge workers
          const response = await fetch(targetUrl, { 
            redirect: "manual",
            headers: { "User-Agent": "DevSuite-Worker/1.1" }
          });

          const step = {
            url: targetUrl,
            status: response.status,
            nextUrl: response.headers.get("location"),
            headers: Object.fromEntries(response.headers.entries())
          };

          send({ url: targetUrl, result: { finalUrl: targetUrl, chain: [step], success: true } });
        } catch (err) {
          send({ url: targetUrl, result: { error: err.message, success: false, chain: [] } });
        }
      };

      // Process all URLs in parallel
      await Promise.all(targetUrls.map(traceTask));
      
      // Signal the end of the stream to RedirectChecker.jsx
      controller.enqueue(encoder.encode("event: end\ndata: done\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}