const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

async function traceUrl(url, chain = []) {
  const MAX_HOPS = 10;
  const TIMEOUT = 5000; // 5 seconds per request

  if (chain.length >= MAX_HOPS) {
    return { finalUrl: url, chain: [...chain, { url, status: 'Loop Detected' }], success: false };
  }

  try {
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
      headers: response.headers // Sending all headers for the table
    });

    if (nextUrl) {
      return traceUrl(nextUrl, chain);
    }

    return { finalUrl: url, chain, success: true };
  } catch (error) {
    const status = error.code === 'ECONNABORTED' ? 'Timeout' : (error.response?.status || 'Error');
    return { 
      finalUrl: url, 
      chain: [...chain, { url, status, headers: {} }], 
      success: false 
    };
  }
}

app.post('/api/trace', async (req, res) => {
  const { urls } = req.body;
  try {
    const results = await Promise.all(urls.map(url => traceUrl(url)));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Server failed to process requests" });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));