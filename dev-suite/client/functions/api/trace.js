export async function onRequestPost(context) {
  const { urls } = await context.request.json();

  const traceUrl = async (url, chain = []) => {
    const MAX_HOPS = 10;
    if (chain.length >= MAX_HOPS) return { finalUrl: url, chain, success: false };

    try {
      // We use redirect: 'manual' to intercept the 301/302 codes
      const response = await fetch(url, { 
        redirect: 'manual',
        headers: { 'User-Agent': 'DevSuite/1.0' } 
      });

      const nextUrl = response.headers.get('location');
      const absoluteNextUrl = nextUrl ? new URL(nextUrl, url).href : null;

      chain.push({
        url,
        status: response.status,
        nextUrl: absoluteNextUrl,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (absoluteNextUrl && response.status >= 300 && response.status < 400) {
        return traceUrl(absoluteNextUrl, chain);
      }

      return { finalUrl: url, chain, success: true };
    } catch (err) {
      return { finalUrl: url, chain: [...chain, { url, status: 'Error' }], success: false };
    }
  };

  const results = await Promise.all(urls.map(url => traceUrl(url)));
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  });
}