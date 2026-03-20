import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ArrowRight, Loader2, Trash2 } from 'lucide-react';

/**
 * Helper to determine Tailwind classes based on status code
 * 2xx: Green, 3xx: Yellow/Amber, 4xx+: Red
 */
const getStatusColor = (status) => {
  const s = parseInt(status);
  if (s >= 200 && s < 300) return 'bg-green-100 text-green-700 border-green-200';
  if (s >= 300 && s < 400) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (s >= 400) return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export default function RedirectChecker() {
  const [urls, setUrls] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

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

    const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8787' : '';
    const encodedUrls = encodeURIComponent(JSON.stringify(urlList));
    const streamUrl = `${baseUrl}/api/trace-stream?urls=${encodedUrls}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.result) setResults((prev) => [...prev, data.result]);
      } catch (err) { console.error("Parse error:", err); }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setLoading(false);
    };

    eventSource.addEventListener('end', () => {
      eventSource.close();
      setLoading(false);
    });
  };

  const clearResults = () => {
    setResults([]);
    setExpandedIndex(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Redirect Trace</h1>
          <p className="text-slate-500 text-lg">Analyze hop-by-hop resolution and HTTP headers in real-time.</p>
        </div>
        {results.length > 0 && (
          <button
            onClick={clearResults}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={16} />
            Clear Results
          </button>
        )}
      </header>

      {/* Input Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <textarea
          className="w-full h-32 p-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm mb-4 transition-all"
          placeholder="Enter URLs (one per line)..."
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
        />
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md"
        >
          {loading && <Loader2 className="animate-spin" size={20} />}
          {loading ? `Tracing (${elapsedTime}s)...` : 'Start Analysis'}
        </button>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {results.map((res, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-indigo-200 transition-all">
            <button 
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              className="w-full text-left p-4 hover:bg-slate-50 transition flex items-center gap-4"
            >
              <div className="shrink-0">
                {expandedIndex === i ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
              </div>

              <div className="flex flex-col gap-2 min-w-0 flex-1">
                {/* URL Summary */}
                <span className="font-mono text-sm text-slate-600 truncate font-medium">
                  {res.finalUrl || res.url}
                </span>

                {/* The Full Redirect Path Sequence */}
                <div className="flex items-center gap-1 flex-wrap">
                  {res.chain.map((step, idx) => (
                    <React.Fragment key={idx}>
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold shadow-sm ${getStatusColor(step.status)}`}>
                        {step.status}
                      </span>
                      {idx < res.chain.length - 1 && (
                        <ArrowRight size={12} className="text-slate-300 mx-0.5 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                  <span className="ml-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    ({res.chain.length} {res.chain.length === 1 ? 'step' : 'steps'})
                  </span>
                </div>
              </div>
            </button>

            {expandedIndex === i && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6">
                {res.chain.map((step, si) => (
                  <div key={si} className="relative pl-8 border-l-2 border-indigo-100 pb-6 last:pb-0">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm" />
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded border ${getStatusColor(step.status)}`}>
                          {step.status}
                        </span>
                        <span className="text-sm font-mono text-slate-500 break-all">{step.url}</span>
                      </div>
                      
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-xs text-left">
                          <tbody className="divide-y divide-slate-100">
                            {Object.entries(step.headers || {}).map(([key, val]) => (
                              <tr key={key} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2 font-bold text-slate-400 w-1/3 lowercase border-r border-slate-100 bg-slate-50/30">{key}</td>
                                <td className="px-4 py-2 text-slate-700 font-mono break-all">{val}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {step.nextUrl && (
                        <div className="flex items-center gap-2 text-[11px] text-indigo-500 font-semibold bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-100">
                          <ArrowRight size={12} />
                          <span>Next: {step.nextUrl}</span>
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