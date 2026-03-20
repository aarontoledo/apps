import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ArrowRight, Loader2 } from 'lucide-react';

export default function RedirectChecker() {
  const [urls, setUrls] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Simple timer for user feedback while the worker processes hops
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const runAnalysis = () => {
    const urlList = urls.split('\n').map(u => u.trim()).filter(u => u !== '');
    if (urlList.length === 0) return;

    setLoading(true);
    setResults([]);
    setExpandedIndex(null);

    // DETERMINING THE API URL:
    // If we are on localhost, point to the Wrangler port (8787).
    // If deployed, use a relative path.
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8787' 
      : '';
    
    const encodedUrls = encodeURIComponent(JSON.stringify(urlList));
    const streamUrl = `${baseUrl}/api/trace-stream?urls=${encodedUrls}`;

    // Initialize the EventSource for streaming results
    const eventSource = new EventSource(streamUrl);

    // This triggers every time the Worker calls controller.enqueue()
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.result) {
          setResults((prev) => [...prev, data.result]);
        }
      } catch (err) {
        console.error("Error parsing stream data:", err);
      }
    };

    // Listen for the custom 'end' event sent by the Worker
    eventSource.addEventListener('end', () => {
      console.log("Stream completed successfully");
      eventSource.close();
      setLoading(false);
    });

    // Handle connection errors (CORS, SSRF blocks, or Server down)
    eventSource.onerror = (err) => {
      console.error("EventSource failed. This is likely a CORS issue or the Worker is not running:", err);
      eventSource.close();
      setLoading(false);
    };
  };

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Redirect Trace</h1>
        <p className="text-slate-500 text-lg">Analyze hop-by-hop resolution and HTTP headers in real-time.</p>
      </header>

      {/* Input Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Target URLs</label>
        <textarea
          className="w-full h-32 p-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm mb-4 transition-all"
          placeholder="https://google.com&#10;https://bit.ly/example"
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
        />
        
        <div className="flex items-center gap-4">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {loading ? `Tracing (${elapsedTime}s)...` : 'Start Analysis'}
          </button>
          {loading && <span className="text-sm text-slate-400 animate-pulse">Streaming results from the edge...</span>}
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {results.map((res, i) => (
          <div 
            key={i} 
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-indigo-200 transition-colors animate-in fade-in slide-in-from-bottom-2"
          >
            <button 
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-4 truncate">
                {expandedIndex === i ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${res.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {res.chain?.length || 0} {res.chain?.length === 1 ? 'Hop' : 'Hops'}
                </span>
                <span className="font-mono text-sm text-slate-600 truncate max-w-md">{res.finalUrl || res.url}</span>
              </div>
              {!res.success && <span className="text-xs text-red-500 font-medium">Failed</span>}
            </button>

            {expandedIndex === i && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6">
                {res.chain.map((step, si) => (
                  <div key={si} className="relative pl-8 border-l-2 border-indigo-100 pb-6 last:pb-0">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm" />
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${step.status >= 300 && step.status < 400 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {step.status}
                        </span>
                        <span className="text-sm font-mono text-slate-500 break-all">{step.url}</span>
                      </div>
                      
                      {/* Headers Table */}
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2 font-semibold">HTTP Header</th>
                              <th className="px-4 py-2 font-semibold">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {Object.entries(step.headers || {}).map(([key, val]) => (
                              <tr key={key} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2 font-bold text-slate-400 w-1/3 lowercase">{key}</td>
                                <td className="px-4 py-2 text-slate-700 font-mono break-all">{val}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {step.nextUrl && (
                        <div className="flex items-center gap-2 text-xs text-indigo-500 font-medium bg-indigo-50 w-fit px-3 py-1 rounded-md">
                          <ArrowRight size={14} />
                          <span>Redirecting to: {step.nextUrl}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}