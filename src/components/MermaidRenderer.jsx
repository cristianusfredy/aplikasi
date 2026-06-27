import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertTriangle, Wand2 } from 'lucide-react';

// Initialize mermaid config
try {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    themeVariables: {
      background: '#1e293b',
      primaryColor: '#6366f1',
      primaryTextColor: '#fff',
      lineColor: '#475569',
    }
  });
} catch (e) {
  console.error("Failed to initialize mermaid", e);
}

export default function MermaidRenderer({ chart, onFixError }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    setHasApiKey(!!localStorage.getItem('gemini_api_key'));
  }, [chart]);

  useEffect(() => {
    if (!chart || !containerRef.current) return;

    setError(null);
    setSvg('');

    const renderId = `mermaid-${Math.floor(Math.random() * 100000)}`;

    const renderChart = async () => {
      try {
        // Clean container first
        containerRef.current.innerHTML = `<div id="${renderId}">${chart}</div>`;
        const { svg: renderedSvg } = await mermaid.render(renderId, chart);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error("Mermaid Render Error:", err);
        setError(err.message || 'Sintaks diagram Mermaid tidak valid.');
        // Clean up DOM after failure
        const badEl = document.getElementById(renderId);
        if (badEl) badEl.remove();
        const bindEl = document.getElementById(`d${renderId}`);
        if (bindEl) bindEl.remove();
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div className="w-full bg-slate-800/50 border border-slate-700/60 rounded-lg p-4 my-4 flex flex-col items-center justify-center min-h-[150px]">
      {error ? (
        <div className="w-full flex flex-col gap-3">
          <div className="flex items-start gap-2.5 text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 text-xs font-mono overflow-x-auto">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
          
          {onFixError && (
            <button
              onClick={() => onFixError(chart, error)}
              className="self-end flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {hasApiKey ? 'Perbaiki Diagram dengan AI' : 'Simulasikan Perbaikan AI'}
            </button>
          )}
        </div>
      ) : svg ? (
        <div 
          className="w-full overflow-x-auto flex justify-center py-2" 
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      ) : (
        <div className="text-slate-500 text-xs animate-pulse">Memuat diagram...</div>
      )}

      {/* Hidden container used to perform off-screen rendering */}
      <div ref={containerRef} className="hidden" />
    </div>
  );
}
