import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ArrowRight, Loader2 } from 'lucide-react';

export default function RedirectChecker() {
  const [urls, setUrls] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer logic for user feedback
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const runAnalysis = async () => {
    setLoading(true);
    setResults([]);
    const urlList = urls.split('\n').filter(u => u.trim() !== '');
    
    try {
      // OLD: const res = await fetch('http://localhost:3001/api/trace', ...
      // NEW: Just use the relative path. Cloudflare handles the rest!
      // This path works because Cloudflare maps /functions/api/trace.js 
      // directly to the root of your domain.
      const res = await fetch('/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      setResults(data);
    } catch (err) { 
      console.error("Fetch error:", err);
      // Helpful for debugging in the browser
      alert("Analysis failed. Ensure the Cloudflare Function is deployed.");
    } finally { 
      setLoading(false); 
    }
  }; 

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Redirect Trace</h1>
        <p className="text-slate-500">Analyze hop-by-hop resolution and HTTP headers.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <textarea
          className="w-full h-32 p-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm mb-4"
          placeholder="Enter URLs (one per line)..."
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
        />
        
        <div className="flex items-center gap-4">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {loading ? `Analyzing (${elapsedTime}s)...` : 'Analyze URLs'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {results.map((res, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-4 truncate">
                {expandedIndex === i ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${res.success ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {res.chain.length} Hops
                </span>
                <span className="font-mono text-sm text-slate-600 truncate">{res.finalUrl}</span>
              </div>
            </button>

            {expandedIndex === i && (
              <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
                {res.chain.map((step, si) => (
                  <div key={si} className="relative pl-8 border-l-2 border-indigo-200 pb-4 last:pb-0">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500" />
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600">{step.status}</span>
                        <span className="text-sm font-mono text-slate-500 break-all">{step.url}</span>
                      </div>
                      
                      <div className="mt-2 bg-white rounded border border-slate-200 overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-600 uppercase">
                            <tr>
                              <th className="px-3 py-1 font-semibold">Header</th>
                              <th className="px-3 py-1 font-semibold">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {Object.entries(step.headers || {}).map(([key, val]) => (
                              val && (
                                <tr key={key} className="hover:bg-slate-50">
                                  <td className="px-3 py-1 font-bold text-slate-500 border-r border-slate-100 w-1/3 lowercase">{key}</td>
                                  <td className="px-3 py-1 text-slate-700 font-mono break-all">{typeof val === 'string' ? val : JSON.stringify(val)}</td>
                                </tr>
                              )
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {step.nextUrl && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 font-mono">
                          <ArrowRight size={14} />
                          <span>Location: {step.nextUrl}</span>
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