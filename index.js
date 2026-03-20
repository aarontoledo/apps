/**
 * DevSuite Unified Worker
 * Handles Redirect Trace API with Manual Hop Following
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight
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

      const traceTask = async (originalUrl) => {
        let currentUrl = originalUrl;
        let chain = [];
        let redirectCount = 0;
        const maxRedirects = 15;

        try {
          while (redirectCount < maxRedirects) {
            const response = await fetch(currentUrl, { 
              method: "GET",
              redirect: "manual", 
              headers: { 
                "User-Agent": "DevSuite-Trace/1.2 (Cloudflare Worker)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
              }
            });

            const step = {
              url: currentUrl,
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
              nextUrl: response.headers.get("location")
            };

            chain.push(step);

            if (response.status >= 300 && response.status < 400 && step.nextUrl) {
              const nextDestination = new URL(step.nextUrl, currentUrl).href;
              if (nextDestination === currentUrl) break;
              currentUrl = nextDestination;
              redirectCount++;
            } else {
              break;
            }
          }

          // MASTER LEVEL DATA: Mapping requestedUrl to finalUrl
          send({ 
            url: originalUrl, 
            result: { 
              requestedUrl: originalUrl, 
              finalUrl: currentUrl, 
              chain: chain, 
              success: true 
            } 
          });
        } catch (err) {
          send({ 
            url: originalUrl, 
            result: { 
              requestedUrl: originalUrl,
              error: err.message, 
              success: false, 
              chain: chain,
              finalUrl: currentUrl 
            } 
          });
        }
      };

      await Promise.all(targetUrls.map(traceTask));
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