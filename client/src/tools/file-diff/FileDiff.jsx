import { useState, useRef } from 'react';

function LineNumberedTextarea({ value, onChange, placeholder }) {
  const textareaRef = useRef(null);
  const lineNumsRef = useRef(null);

  const lineCount = value === '' ? 1 : value.split('\n').length;

  const syncScroll = () => {
    if (lineNumsRef.current && textareaRef.current) {
      lineNumsRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className="flex h-56 border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-colors">
      <div
        ref={lineNumsRef}
        className="bg-slate-50 border-r border-slate-200 text-slate-400 text-right py-4 px-3 overflow-hidden select-none font-mono text-sm shrink-0 leading-6"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="leading-6">{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className="flex-1 py-4 px-4 font-mono text-sm outline-none resize-none bg-white leading-6"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onScroll={syncScroll}
        spellCheck={false}
      />
    </div>
  );
}

function computeDiff(originalText, modifiedText) {
  const aLines = originalText === '' ? [] : originalText.split('\n');
  const bLines = modifiedText === '' ? [] : modifiedText.split('\n');
  const m = aLines.length;
  const n = bLines.length;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aLines[i - 1] === bLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      result.push({ type: 'equal', content: aLines[i - 1], oldNum: i, newNum: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'insert', content: bLines[j - 1], oldNum: null, newNum: j });
      j--;
    } else {
      result.push({ type: 'delete', content: aLines[i - 1], oldNum: i, newNum: null });
      i--;
    }
  }

  return result.reverse();
}

export default function FileDiff() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [diff, setDiff] = useState(null);

  const handleCompare = () => {
    setDiff(computeDiff(original, modified));
  };

  const handleClear = () => {
    setOriginal('');
    setModified('');
    setDiff(null);
  };

  const stats = diff ? {
    added: diff.filter(l => l.type === 'insert').length,
    removed: diff.filter(l => l.type === 'delete').length,
    unchanged: diff.filter(l => l.type === 'equal').length,
  } : null;

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">File Diff</h1>
        <p className="text-slate-500 text-lg">Paste two texts below to compare their differences line by line.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Original</label>
            <LineNumberedTextarea
              value={original}
              onChange={e => setOriginal(e.target.value)}
              placeholder="Paste original text here..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Modified</label>
            <LineNumberedTextarea
              value={modified}
              onChange={e => setModified(e.target.value)}
              placeholder="Paste modified text here..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCompare}
            className="flex items-center gap-2 px-8 py-3 rounded-lg font-bold shadow-md transition-all bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Compare
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {diff !== null && (
        <div>
          <div className="flex gap-4 mb-3 text-sm font-medium">
            <span className="text-green-600">+{stats.added} added</span>
            <span className="text-red-500">-{stats.removed} removed</span>
            <span className="text-slate-500">{stats.unchanged} unchanged</span>
          </div>

          {diff.length === 0 ? (
            <div className="p-4 bg-slate-100 rounded-lg text-slate-500 text-sm text-center">
              The two texts are identical.
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden border border-slate-200 font-mono text-sm">
              <div className="bg-slate-800 text-slate-400 px-4 py-2 text-xs flex items-center gap-2">
                <span className="w-10 text-right select-none">Old</span>
                <span className="w-10 text-right select-none ml-2">New</span>
                <span className="ml-4">Content</span>
              </div>
              <div className="overflow-x-auto bg-slate-950">
                {diff.map((line, idx) => {
                  let rowBg, prefix, textColor, lineNumColor;
                  if (line.type === 'insert') {
                    rowBg = 'bg-green-950/60';
                    prefix = '+';
                    textColor = 'text-green-300';
                    lineNumColor = 'text-green-800';
                  } else if (line.type === 'delete') {
                    rowBg = 'bg-red-950/60';
                    prefix = '-';
                    textColor = 'text-red-300';
                    lineNumColor = 'text-red-800';
                  } else {
                    rowBg = '';
                    prefix = ' ';
                    textColor = 'text-slate-400';
                    lineNumColor = 'text-slate-700';
                  }
                  return (
                    <div key={idx} className={`flex items-start px-4 py-0.5 ${rowBg}`}>
                      <span className={`w-10 text-right shrink-0 mr-2 text-xs leading-5 select-none ${lineNumColor}`}>
                        {line.oldNum ?? ''}
                      </span>
                      <span className={`w-10 text-right shrink-0 mr-2 text-xs leading-5 select-none ${lineNumColor}`}>
                        {line.newNum ?? ''}
                      </span>
                      <span className={`shrink-0 select-none mr-2 leading-5 ${textColor}`}>{prefix}</span>
                      <span className={`whitespace-pre leading-5 ${textColor}`}>{line.content}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
