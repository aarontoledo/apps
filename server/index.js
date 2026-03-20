const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dns = require('dns').promises; // Required for SSRF protection

const app = express();
app.use(cors());
app.use(express.json());

/**
 * SSRF Protection: Validates if an IP address is private/internal.
 * This prevents the server from being used to scan your local network.
 */
const isIpPrivate = (ip) => {
  const parts = ip.split('.').map(Number);
  return (
    parts[0] === 10 || // 10.0.0.0/8
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.0.0/12
    (parts[0] === 192 && parts[1] === 168) || // 192.168.0.0/16
    parts[0] === 127 || // Loopback
    ip === '::1' // IPv6 Loopback
  );
};

/**
 * Validates the URL protocol and resolves the hostname to check for private IPs.
 */
const validateUrlSafety = async (userUrl) => {
  const url = new URL(userUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Invalid protocol: Only HTTP and HTTPS are allowed');
  }

  try {
    const { address } = await dns.lookup(url.hostname);
    if (isIpPrivate(address)) {
      throw new Error('Access to internal network addresses is prohibited');
    }
  } catch (err) {
    throw new Error(`DNS Lookup failed: ${err.message}`);
  }
};

async function traceUrl(url, chain = []) {
  const MAX_HOPS = 10;
  const TIMEOUT = 5000; // 5 seconds per request

  if (chain.length >= MAX_HOPS) {
    return { url, result: { finalUrl: url, chain: [...chain, { url, status: 'Loop Detected' }], success: false }, status: 'error' };
  }

  try {
    // Perform safety check before every hop
    await validateUrlSafety(url);

    const response = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: { 'User-Agent': 'DevSuite/1.0' },
      timeout: TIMEOUT
    });

    const nextUrl = response.headers.location 
      ? new URL(response.headers.location, url).href 
      : null;

    chain.push({ 
      url, 
      status: response.status,
      nextUrl,
      headers: response.headers
    });

    if (nextUrl) {
      return traceUrl(nextUrl, chain);
    }

    return { url, result: { finalUrl: url, chain, success: true }, status: 'success' };
  } catch (error) {
    const statusText = error.code === 'ECONNABORTED' ? 'Timeout' : (error.response?.status || error.message || 'Error');
    return { 
      url, 
      result: { 
        finalUrl: url, 
        chain: [...chain, { url, status: statusText, headers: {} }], 
        success: false 
      }, 
      status: 'error' 
    };
  }
}

/**
 * Updated Endpoint: Uses Server-Sent Events (SSE) to stream results back to the client.
 * The client should connect via GET and pass URLs as a query parameter or use a POST 
 * and convert to an EventSource-compatible flow.
 */
app.get('/api/trace-stream', async (req, res) => {
  const rawUrls = req.query.urls;
  const urls = JSON.parse(decodeURIComponent(rawUrls || '[]'));

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 

  // Process each URL and stream result immediately upon completion
  const tasks = urls.map(async (url) => {
    const data = await traceUrl(url);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  await Promise.all(tasks);
  
  // Signal to client that the stream is finished
  res.write('event: end\ndata: done\n\n');
  res.end();
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));