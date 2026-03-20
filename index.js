/**
 * DevSuite Unified Worker
 * Optimized with staggered execution to avoid 429 Rate Limits.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/trace-stream") {
      return handleTraceStream(request, corsHeaders);
    }

    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response("Asset Not Found", { status: 404 });
    }
  },
};

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
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DevSuite-Trace/1.2",
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

          send({ 
            url: originalUrl, 
            result: { requestedUrl: originalUrl, finalUrl: currentUrl, chain: chain, success: true } 
          });
        } catch (err) {
          send({ 
            url: originalUrl, 
            result: { requestedUrl: originalUrl, error: err.message, success: false, chain: chain, finalUrl: currentUrl } 
          });
        }
      };

      // Staggered Execution to prevent 429s
      const CONCURRENCY_LIMIT = 5; 
      for (let i = 0; i < targetUrls.length; i += CONCURRENCY_LIMIT) {
        const group = targetUrls.slice(i, i + CONCURRENCY_LIMIT);
        
        await Promise.all(group.map(async (targetUrl, index) => {
          // Stagger each request within the group by 250ms
          await new Promise(r => setTimeout(r, index * 250));
          return traceTask(targetUrl);
        }));

        // Small breather between internal groups
        if (i + CONCURRENCY_LIMIT < targetUrls.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
      
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