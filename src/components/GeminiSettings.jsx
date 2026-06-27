import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, XCircle, RefreshCw, HelpCircle, ChevronDown } from 'lucide-react';

export default function GeminiSettings({ onKeySaved }) {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('idle'); // idle, testing, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('models/gemini-1.5-flash');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    const savedModel = localStorage.getItem('gemini_model') || 'models/gemini-1.5-flash';
    setApiKey(savedKey);
    setSelectedModel(savedModel);
    if (savedKey) {
      setStatus('success');
      // Fetch models silently to populate list
      fetchModelsList(savedKey, savedModel);
    }
  }, []);

  const fetchModelsList = async (key, currentModel) => {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (res.ok) {
        const data = await res.json();
        const available = (data.models || [])
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name);
        
        setModels(available);
        if (available.length > 0 && !available.includes(currentModel)) {
          // Fallback to first flash model or first available
          const bestModel = available.find(m => m.includes('flash')) || available[0];
          setSelectedModel(bestModel);
          localStorage.setItem('gemini_model', bestModel);
        }
      }
    } catch (e) {
      console.error("Failed to load model list", e);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('gemini_model');
      setStatus('idle');
      if (onKeySaved) onKeySaved('');
      return;
    }
    localStorage.setItem('gemini_api_key', apiKey.trim());
    localStorage.setItem('gemini_model', selectedModel);
    setStatus('success');
    if (onKeySaved) onKeySaved(apiKey.trim());
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setStatus('error');
      setErrorMessage('API Key tidak boleh kosong.');
      return;
    }

    setStatus('testing');
    setErrorMessage('');

    try {
      // Step 1: Fetch list of supported models first
      const listResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`
      );
      
      if (!listResponse.ok) {
        const errData = await listResponse.json();
        setStatus('error');
        setErrorMessage(errData.error?.message || 'API Key tidak valid atau diblokir.');
        return;
      }

      const listData = await listResponse.json();
      const availableModels = (listData.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name);

      if (availableModels.length === 0) {
        setStatus('error');
        setErrorMessage('Tidak ada model yang mendukung generateContent untuk API Key ini.');
        return;
      }

      setModels(availableModels);
      
      // Select best model
      let modelToTest = selectedModel;
      if (!availableModels.includes(modelToTest)) {
        modelToTest = availableModels.find(m => m.includes('flash')) || availableModels[0];
        setSelectedModel(modelToTest);
      }

      // Step 2: Test generateContent with the chosen model
      const testResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelToTest}:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello' }] }],
          }),
        }
      );

      const testData = await testResponse.json();

      if (testResponse.ok) {
        setStatus('success');
        localStorage.setItem('gemini_api_key', apiKey.trim());
        localStorage.setItem('gemini_model', modelToTest);
        if (onKeySaved) onKeySaved(apiKey.trim());
      } else {
        setStatus('error');
        setErrorMessage(
          `Gagal menguji model ${modelToTest.replace('models/', '')}: ${
            testData.error?.message || 'Error tidak diketahui.'
          }`
        );
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage('Terjadi kesalahan jaringan.');
    }
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    localStorage.setItem('gemini_model', model);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl max-w-md w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
          <Key className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Pengaturan Gemini API</h3>
          <p className="text-xs text-slate-400">Untuk brainstorming & bantuan AI riil</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Gemini API Key</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <HelpCircle className="w-3 h-3" /> Dapatkan API Key Gratis
            </a>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {models.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Pilih Model Gemini
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white appearance-none focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m.replace('models/', '')}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-450 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            {status === 'success' && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Terkoneksi
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <XCircle className="w-3.5 h-3.5" /> Gagal
              </span>
            )}
            {status === 'testing' && (
              <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menguji...
              </span>
            )}
            {status === 'idle' && (
              <span className="text-slate-400">Belum diatur</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={testConnection}
              disabled={status === 'testing'}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-650 text-white rounded-md transition-colors"
            >
              Uji Koneksi
            </button>
            <button
              type="submit"
              disabled={status === 'testing'}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors"
            >
              Simpan
            </button>
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/25 mt-2 overflow-hidden text-ellipsis whitespace-pre-wrap">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}
