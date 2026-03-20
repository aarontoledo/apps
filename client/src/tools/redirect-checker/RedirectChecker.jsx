import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronDown, ChevronRight, ArrowRight, Loader2, Trash2, 
  Download, AlertCircle, CheckCircle2, XCircle, Filter, 
  AlertTriangle, Check
} from 'lucide-react';

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
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [filter, setFilter] = useState('all'); 
  
  const cancelRef = useRef(false);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Logic to determine success vs error for filtering
  const filteredResults = useMemo(() => {
    if (filter === 'all') return results;
    return results.filter(res => {
      const finalStep = res.chain?.[res.chain.length - 1];
      const finalStatus = finalStep ? parseInt(finalStep.status) : 0;
      const isError = !res.success || finalStatus >= 400 || finalStatus === 0;
      
      return filter === 'errors' ? isError : !isError;
    });
  }, [results, filter]);

  const runAnalysis = async () => {
    const rawUrls = urls.split('\n').map(u => u.trim()).filter(u => u !== '');
    const urlList = rawUrls.slice(0, 500);
    if (urlList.length === 0) return;

    const BATCH_SIZE = 25;
    const batches = [];
    for (let i = 0; i < urlList.length; i += BATCH_SIZE) {
      batches.push(urlList.slice(i, i + BATCH_SIZE));
    }

    setLoading(true);
    setResults([]);
    setExpandedIndex(null);
    setTotalBatches(batches.length);
    setFilter('all');
    cancelRef.current = false;

    for (let i = 0; i < batches.length; i++) {
      if (cancelRef.current) break;
      setCurrentBatch(i + 1);
      await processBatch(batches[i]);
      if (cancelRef.current) break;
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setLoading(false);
    setCurrentBatch(0);
  };

  const processBatch = (batchUrls) => {
    return new Promise((resolve) => {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8787' : '';
      const encodedUrls = encodeURIComponent(JSON.stringify(batchUrls));
      const eventSource = new EventSource(`${baseUrl}/api/trace-stream?urls=${encodedUrls}`);

      eventSource.onmessage = (event) => {
        if (cancelRef.current) {
          eventSource.close();
          resolve();
          return;
        }
        try {
          const data = JSON.parse(event.data);
          if (data.result) setResults((prev) => [...prev, data.result]);
        } catch (err) { console.error("Parse error:", err); }
      };

      eventSource.addEventListener('end', () => {
        eventSource.close();
        resolve();
      });

      eventSource.onerror = () => {
        eventSource.close();
        resolve(); 
      };
    });
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setLoading(false);
  };

  const downloadResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.href = url;
    link.download = `devsuite-trace-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    setResults([]);
    setExpandedIndex(null);
    setCurrentBatch(0);
    setTotalBatches(0);
    setFilter('all');
  };

  const urlCount = urls.split('\n').filter(u => u.trim()).length;
  const isOverLimit = urlCount > 500;

  // Counts for the filter buttons
  const counts = useMemo(() => {
    const errs = results.filter(res => {
      const finalStep = res.chain?.[res.chain.length - 1];
      const finalStatus = finalStep ? parseInt(finalStep.status) : 0;
      return !res.success || finalStatus >= 400 || finalStatus === 0;
    }).length;
    return {
      all: results.length,
      errors: errs,
      success: results.length - errs
    };
  }, [results]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Redirect Trace</h1>
          <p className="text-slate-500 text-lg">Analyze hop-by-hop resolution and HTTP headers in real-time.</p>
        </div>
        
        {results.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={downloadResults}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
            >
              <Download size={16} />
              Download JSON
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button
              onClick={clearResults}
              className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>
        )}
      </header>

      {/* Input Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <textarea
          className={`w-full h-48 p-4 rounded-lg border focus:ring-2 outline-none font-mono text-sm mb-3 transition-all ${
            isOverLimit ? 'border-red-300 focus:ring-red-500 bg-red-50/30' : 'border-slate-300 focus:ring-indigo-500'
          }`}
          placeholder="Enter up to 500 URLs..."
          value={urls}
          disabled={loading}
          onChange={(e) => setUrls(e.target.value)}
        />
        
        <div className="flex items-center justify-between mb-6 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            {isOverLimit ? (
              <span className="text-red-600 flex items-center gap-1.5 animate-pulse"><AlertCircle size={14}/> Over Limit: First 500 only</span>
            ) : urlCount > 0 ? (
              <span className="text-green-600 flex items-center gap-1.5"><CheckCircle2 size={14}/> Ready ({urlCount} URLs)</span>
            ) : <span className="text-slate-400">Max 500 URLs</span>}
          </div>
          <span className={`${isOverLimit ? 'text-red-600' : 'text-slate-400'}`}>{urlCount} / 500</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runAnalysis}
            disabled={loading || urlCount === 0}
            className={`flex items-center gap-2 px-8 py-3 rounded-lg font-bold shadow-md transition-all disabled:opacity-50 ${
              isOverLimit ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {loading ? `Processing Batch ${currentBatch}/${totalBatches}...` : 'Start Analysis'}
          </button>
          {loading && (
            <button onClick={handleCancel} className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-all shadow-sm">
              <XCircle size={18} /> Cancel
            </button>
          )}
        </div>
      </div>
      
      {/* FILTER BAR - Ensure this shows when results exist */}
      {results.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            <Filter size={16} className="text-slate-400 mr-2 shrink-0" />
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                filter === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                filter === 'success' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Check size={14} /> Success ({counts.success})
            </button>
            <button
              onClick={() => setFilter('errors')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                filter === 'errors' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle size={14} /> Errors ({counts.errors})
            </button>
          </div>
          {loading && <span className="text-xs font-medium text-slate-400 italic">Elapsed: {elapsedTime}s</span>}
        </div>
      )}

      {/* Results Display */}
      <div className="space-y-4">
        {filteredResults.length === 0 && results.length > 0 && (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">No results found for the current filter.</p>
          </div>
        )}
        
        {filteredResults.map((res, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-indigo-200 transition-all text-left">
            <button 
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              className="w-full text-left p-4 hover:bg-slate-50 transition flex items-start gap-4"
            >
              <div className="mt-1.5 shrink-0 text-slate-400">
                {expandedIndex === i ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>

              <div className="flex flex-col gap-3 min-w-0 flex-1">
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">In</span>
                      <div className="w-px h-3 bg-slate-200 mt-1"></div>
                    </div>
                    <span className="font-mono text-sm text-slate-500 break-all leading-relaxed pt-0.5">{res.requestedUrl}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-px h-2 bg-slate-200 mb-1"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 leading-none">Out</span>
                    </div>
                    <span className="font-mono text-sm text-indigo-600 font-semibold break-all leading-relaxed pt-0.5">{res.finalUrl}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-wrap pl-9">
                  {res.chain?.map((step, idx) => (
                    <React.Fragment key={idx}>
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold shadow-sm ${getStatusColor(step.status)}`}>
                        {step.status}
                      </span>
                      {idx < res.chain.length - 1 && <ArrowRight size={12} className="text-slate-300 mx-0.5 shrink-0" />}
                    </React.Fragment>
                  ))}
                  <span className="ml-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    ({res.chain?.length || 0} {res.chain?.length === 1 ? 'step' : 'steps'})
                  </span>
                </div>
              </div>
            </button>

            {expandedIndex === i && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6">
                {res.chain?.map((step, si) => (
                  <div key={si} className="relative pl-8 border-l-2 border-indigo-100 pb-6 last:pb-0">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm" />
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded border ${getStatusColor(step.status)}`}>{step.status}</span>
                        <span className="text-sm font-mono text-slate-500 break-all">{step.url}</span>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-xs text-left">
                          <tbody className="divide-y divide-slate-100">
                            {Object.entries(step.headers || {}).map(([key, val]) => (
                              <tr key={key} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-bold text-slate-400 w-1/3 lowercase border-r border-slate-100 bg-slate-50/30">{key}</td>
                                <td className="px-4 py-2 text-slate-700 font-mono break-all">{val}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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