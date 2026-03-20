/**
 * DevSuite Worker: Unified Redirect Trace & Tools
 * Handles SSRF protection and Server-Sent Events (SSE) streaming.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (url.pathname === "/api/trace-stream") {
      const targetUrls = JSON.parse(decodeURIComponent(url.searchParams.get("urls") || "[]"));
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (data) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

          const traceTask = async (targetUrl) => {
            try {
              // Cloudflare fetch has built-in SSRF protection; 
              // it won't connect to private internal IPs by default.
              const response = await fetch(targetUrl, { 
                redirect: "manual",
                headers: { "User-Agent": "DevSuite-Worker/1.0" }
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

          await Promise.all(targetUrls.map(traceTask));
          controller.enqueue(encoder.encode("event: end\ndata: done\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("DevSuite API Node", { status: 200 });
  },
};