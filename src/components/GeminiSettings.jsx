import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, XCircle, RefreshCw, HelpCircle, ChevronDown } from 'lucide-react';

export default function GeminiSettings({ onKeySaved }) {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('idle'); // idle, testing, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider') || 'gemini';
    const savedKey = localStorage.getItem(`${savedProvider}_api_key`) || localStorage.getItem('gemini_api_key') || '';
    const savedModel = localStorage.getItem(`${savedProvider}_model`) || localStorage.getItem('gemini_model') || '';
    
    setProvider(savedProvider);
    setApiKey(savedKey);
    setSelectedModel(savedModel);
    
    if (savedKey) {
      setStatus('success');
      fetchModelsList(savedProvider, savedKey, savedModel);
    }
  }, []);

  const fetchModelsList = async (currentProvider, key, currentModel) => {
    try {
      if (currentProvider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (res.ok) {
          const data = await res.json();
          const available = (data.models || [])
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name);
          
          setModels(available);
          if (available.length > 0 && (!currentModel || !available.includes(currentModel))) {
            const bestModel = available.find(m => m.includes('flash')) || available[0];
            setSelectedModel(bestModel);
            localStorage.setItem('gemini_model', bestModel);
          }
        }
      } else if (currentProvider === 'openrouter' || currentProvider === 'groq') {
        const baseUrl = currentProvider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.groq.com/openai/v1';
        const res = await fetch(`${baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        if (res.ok) {
          const data = await res.json();
          const available = (data.data || []).map(m => m.id);
          
          setModels(available);
          if (available.length > 0 && (!currentModel || !available.includes(currentModel))) {
            const bestModel = currentProvider === 'openrouter' 
              ? (available.find(m => m.includes('haiku') || m.includes('flash')) || available[0])
              : (available.find(m => m.includes('llama3')) || available[0]);
            setSelectedModel(bestModel);
            localStorage.setItem(`${currentProvider}_model`, bestModel);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load model list", e);
    }
  };

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    const savedKey = localStorage.getItem(`${newProvider}_api_key`) || (newProvider === 'gemini' ? localStorage.getItem('gemini_api_key') : '');
    const savedModel = localStorage.getItem(`${newProvider}_model`) || (newProvider === 'gemini' ? localStorage.getItem('gemini_model') : '');
    setApiKey(savedKey || '');
    setSelectedModel(savedModel || '');
    setStatus(savedKey ? 'success' : 'idle');
    setErrorMessage('');
    setModels([]);
    if (savedKey) {
      fetchModelsList(newProvider, savedKey, savedModel);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      localStorage.removeItem(`${provider}_api_key`);
      localStorage.removeItem(`${provider}_model`);
      if (provider === 'gemini') {
        localStorage.removeItem('gemini_api_key');
        localStorage.removeItem('gemini_model');
      }
      setStatus('idle');
      if (onKeySaved) onKeySaved('');
      return;
    }
    localStorage.setItem('ai_provider', provider);
    localStorage.setItem(`${provider}_api_key`, apiKey.trim());
    localStorage.setItem(`${provider}_model`, selectedModel);
    
    // Legacy support
    if (provider === 'gemini') {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      localStorage.setItem('gemini_model', selectedModel);
    }
    
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
      let availableModels = [];
      let modelToTest = selectedModel;

      if (provider === 'gemini') {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
        if (!listResponse.ok) {
          const errData = await listResponse.json();
          throw new Error(errData.error?.message || 'API Key tidak valid atau diblokir.');
        }
        const listData = await listResponse.json();
        availableModels = (listData.models || []).filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name);
        
        if (availableModels.length === 0) throw new Error('Tidak ada model yang mendukung generateContent untuk API Key ini.');
        setModels(availableModels);
        
        if (!availableModels.includes(modelToTest)) {
          modelToTest = availableModels.find(m => m.includes('flash')) || availableModels[0];
          setSelectedModel(modelToTest);
        }

        const testResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${modelToTest}:generateContent?key=${apiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] }),
          }
        );
        const testData = await testResponse.json();
        if (!testResponse.ok) throw new Error(testData.error?.message || 'Error tidak diketahui.');

      } else if (provider === 'openrouter' || provider === 'groq') {
        const baseUrl = provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.groq.com/openai/v1';
        const listResponse = await fetch(`${baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
        });
        if (!listResponse.ok) {
          throw new Error(`Gagal memverifikasi API Key ${provider === 'openrouter' ? 'OpenRouter' : 'Groq'}.`);
        }
        const listData = await listResponse.json();
        availableModels = (listData.data || []).map(m => m.id);
        
        if (availableModels.length === 0) throw new Error('Tidak ada model tersedia.');
        setModels(availableModels);
        
        if (!availableModels.includes(modelToTest)) {
          modelToTest = provider === 'openrouter'
            ? (availableModels.find(m => m.includes('haiku') || m.includes('flash')) || availableModels[0])
            : (availableModels.find(m => m.includes('llama3')) || availableModels[0]);
          setSelectedModel(modelToTest);
        }

        const testResponse = await fetch(
          `${baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({ 
              model: modelToTest,
              messages: [{ role: 'user', content: 'Hello' }]
            }),
          }
        );
        const testData = await testResponse.json();
        if (!testResponse.ok) throw new Error(testData.error?.message || 'Error tidak diketahui.');
      }

      setStatus('success');
      localStorage.setItem('ai_provider', provider);
      localStorage.setItem(`${provider}_api_key`, apiKey.trim());
      localStorage.setItem(`${provider}_model`, modelToTest);
      
      if (provider === 'gemini') {
        localStorage.setItem('gemini_api_key', apiKey.trim());
        localStorage.setItem('gemini_model', modelToTest);
      }
      
      if (onKeySaved) onKeySaved(apiKey.trim());

    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Terjadi kesalahan jaringan.');
    }
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    localStorage.setItem(`${provider}_model`, model);
    if (provider === 'gemini') {
      localStorage.setItem('gemini_model', model);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl max-w-md w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
          <Key className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Pengaturan AI Provider</h3>
          <p className="text-xs text-slate-400">Pilih AI untuk brainstorming</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            AI Provider
          </label>
          <div className="relative">
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white appearance-none focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
              <option value="groq">Groq</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-450 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
            <span>API Key {provider === 'gemini' ? 'Gemini' : provider === 'openrouter' ? 'OpenRouter' : 'Groq'}</span>
            <a
              href={provider === 'gemini' ? "https://aistudio.google.com/app/apikey" : provider === 'openrouter' ? "https://openrouter.ai/keys" : "https://console.groq.com/keys"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <HelpCircle className="w-3 h-3" /> Dapatkan API Key
            </a>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === 'gemini' ? "AIzaSy..." : provider === 'openrouter' ? "sk-or-v1-..." : "gsk_..."}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {models.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Pilih Model
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white appearance-none focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m.startsWith('models/') ? m.replace('models/', '') : m}
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
