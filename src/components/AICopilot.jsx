import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, AlertTriangle, Key, ChevronDown, Check, Copy, RefreshCw } from 'lucide-react';

const SUGGESTIONS = [
  { label: 'Overview & Target', prompt: 'Bantu saya membuat bagian 1. Overview untuk aplikasi ini. Tentukan latar belakang masalah, audiens utama di Indonesia, dan tujuan utama aplikasi.' },
  { label: 'Requirements', prompt: 'Bantu rancang bagian 2. Requirements (kebutuhan fungsional dan non-fungsional) untuk aplikasi ini secara mendetail.' },
  { label: 'User Flow (Mermaid)', prompt: 'Buat diagram Mermaid.js untuk User Flow aplikasi ini. Gunakan format flowchart TD. Kembalikan HANYA blok kode diagram Mermaid.' },
  { label: 'Skema DB (Mermaid)', prompt: 'Rancang ERD (Entity Relationship Diagram) database menggunakan Mermaid.js (erDiagram). Pastikan tabel-tabelnya modular dan aman.' }
];

export default function AICopilot({ prdContent, onInsertText, onUpdateDocument, fixMermaidRequest, openSettings }) {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: 'Halo! Saya AI Brainstorming Copilot Anda. Mari rancang PRD profesional yang developer-friendly. Silakan pilih salah satu arahan cepat di bawah atau tulis ide Anda!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('gemini');
  const messagesEndRef = useRef(null);

  // Load API key from local storage on render & periodically
  useEffect(() => {
    const currentProvider = localStorage.getItem('ai_provider') || 'gemini';
    const key = localStorage.getItem(`${currentProvider}_api_key`) || localStorage.getItem('gemini_api_key') || '';
    setProvider(currentProvider);
    setApiKey(key);
  }, [prdContent]);

  // Handle incoming request to fix Mermaid diagrams
  useEffect(() => {
    if (fixMermaidRequest && fixMermaidRequest.chart) {
      const { chart, error } = fixMermaidRequest;
      const fixPrompt = `Perbaiki sintaks diagram Mermaid.js berikut agar valid dan tidak menyebabkan error render. 
Berikut adalah kode diagram yang error:
\`\`\`mermaid
${chart}
\`\`\`

Berikut adalah pesan error-nya:
${error}

Kembalikan HANYA kode diagram Mermaid yang telah diperbaiki di dalam blok kode \`\`\`mermaid ... \`\`\`. Jangan tambahkan penjelasan teks lainnya.`;
      
      handleSend(null, fixPrompt);
    }
  }, [fixMermaidRequest]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const callGemini = async (userPrompt, chatHistory, mode = 'default') => {
    if (!apiKey) {
      // Simulation mode if key is missing
      return simulateResponse(userPrompt, mode);
    }

    const currentProvider = localStorage.getItem('ai_provider') || 'gemini';
    const model = localStorage.getItem(`${currentProvider}_model`) || (currentProvider === 'gemini' ? localStorage.getItem('gemini_model') : '');

    // Add system instruction as prefix or context
    let systemContext = `Anda adalah Antigravity AI Copilot, pakar Product Manager dan System Architect. 
Tugas Anda adalah memandu pengguna menyusun PRD yang terstruktur, profesional, dan developer-friendly.
Struktur standar PRD yang wajib kita ikuti:
1. Overview (Aplikasi, Masalah utama, Tujuan utama)
2. Requirements
3. Core Features
4. User Flow (Menggunakan diagram Mermaid flowchart TD)
5. Architecture (Menggunakan diagram Mermaid)
6. Database Schema (Menggunakan erDiagram Mermaid)
7. Tech Stack

Saat diminta diagram Mermaid, pastikan sintaksnya 100% valid dan bebas dari karakter ilegal di label.
PENTING: Jika user meminta kamu untuk memperbaiki, merombak, atau menambahkan bagian ke dalam dokumen PRD secara keseluruhan, berikan responsmu dengan membungkus KESELURUHAN konten PRD yang baru/telah diubah di dalam tag <UPDATE_PRD> dan </UPDATE_PRD>. Di luar tag tersebut, berikan pesan konfirmasi singkat.
Konteks dokumen PRD saat ini:
"""
${prdContent.slice(0, 3000)}
"""
`;

    if (mode === 'grill') {
      systemContext = `Anda adalah Senior Product Manager, Lead Engineer, dan Investor yang SANGAT KRITIS.
Tugas Anda adalah membaca PRD berikut dan menginterogasi (Grill) ide tersebut. 
Berikan 3-5 pertanyaan tajam yang mencari celah, edge cases (skenario buruk yang terlewat), risiko keamanan, atau fitur yang buang-buang biaya.
Jangan memuji. Bersikaplah kritis, to-the-point, dan skeptis.
JANGAN mengubah dokumen (Jangan gunakan tag <UPDATE_PRD>).
Konteks dokumen PRD saat ini:
"""
${prdContent.slice(0, 3000)}
"""
`;
    } else if (mode === 'issues') {
      systemContext = `Anda adalah Technical Project Manager dan Scrum Master.
Tugas Anda adalah membaca PRD berikut dan memecahnya menjadi daftar tugas pengembangan (Issues/Tickets).
Kelompokkan menjadi Epic, dan di bawah setiap Epic buat checklist tugas menggunakan Markdown list.
Contoh format yang diinginkan:
### 📌 Epic: Autentikasi
- [ ] Buat UI halaman login
- [ ] Integrasi API login dengan backend

JANGAN mengubah dokumen (Jangan gunakan tag <UPDATE_PRD>). Berikan output HANYA di chat ini agar pengguna bisa menyalinnya.
Konteks dokumen PRD saat ini:
"""
${prdContent.slice(0, 3000)}
"""
`;
    }

    try {
      if (currentProvider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/${model || 'models/gemini-1.5-flash'}:generateContent?key=${apiKey}`;
        const contents = chatHistory.slice(1).map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text }]
        }));

        contents.push({
          role: 'user',
          parts: [{ text: `${systemContext}\n\nPertanyaan/Permintaan Pengguna:\n${userPrompt}` }]
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Error communicating with Gemini');
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak mendapatkan respons.';
      } else if (currentProvider === 'openrouter' || currentProvider === 'groq') {
        const url = currentProvider === 'openrouter' ? `https://openrouter.ai/api/v1/chat/completions` : `https://api.groq.com/openai/v1/chat/completions`;
        const messages = [];
        
        messages.push({ role: 'system', content: systemContext });
        
        chatHistory.slice(1).forEach(m => {
          messages.push({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.text
          });
        });
        
        messages.push({ role: 'user', content: userPrompt });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || (currentProvider === 'openrouter' ? 'anthropic/claude-3-haiku' : 'llama3-8b-8192'),
            messages: messages
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || `Error communicating with ${currentProvider === 'openrouter' ? 'OpenRouter' : 'Groq'}`);
        return data.choices?.[0]?.message?.content || 'Maaf, saya tidak mendapatkan respons.';
      }
    } catch (err) {
      console.error("AI API Error:", err);
      return `Gagal memanggil AI API: ${err.message}. Pastikan API Key Anda valid.`;
    }
  };

  const simulateResponse = (prompt, mode = 'default') => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (mode === 'grill') {
          resolve(`🔥 **GRILL MODE (SIMULASI)** 🔥\n\nSaya telah membaca PRD Anda. Terus terang, masih banyak celah:\n1. **Keamanan Data**: Anda menyimpan data pelanggan, tapi di mana penjelasan enkripsinya?\n2. **Skalabilitas**: Jika user membludak saat weekend, bagaimana arsitektur Anda menanganinya?\n3. **Monetisasi**: Fitur ini bagus, tapi dari mana Anda mendapatkan uang? Siapa yang mau bayar fitur ini?\n\nSilakan revisi PRD Anda untuk menjawab masalah ini!\n\n*(Pasang API Key untuk interogasi AI sungguhan!)*`);
          return;
        } else if (mode === 'issues') {
          resolve(`📋 **TO ISSUES MODE (SIMULASI)** 📋\n\nBerikut adalah pecahan tugas dari PRD Anda:\n\n### 📌 Epic: Manajemen User\n- [ ] Membuat halaman Registrasi\n- [ ] Integrasi Login dengan Google\n\n### 📌 Epic: Transaksi\n- [ ] Membuat keranjang belanja\n- [ ] Menghubungkan Payment Gateway\n\n*(Pasang API Key untuk hasil riil yang akurat!)*`);
          return;
        }
        const lower = prompt.toLowerCase();
        if (lower.includes('mermaid') || lower.includes('flowchart') || lower.includes('diagram')) {
          resolve(`Berikut adalah diagram alur/flowchart yang disimulasikan menggunakan Mermaid.js. Silakan salin ke PRD Anda:

\`\`\`mermaid
flowchart TD
    A[Customer] --> B(Membuka Aplikasi)
    B --> C{Pilih Layanan}
    C -->|Booking| D[Isi Form Detail]
    C -->|Cek Status| E[Masukkan Nomor WA]
    D --> F[Lakukan Pembayaran]
    F --> G[Verifikasi oleh Admin]
    G --> H[Booking Selesai]
\`\`\`

*(Catatan: Anda sedang menggunakan mode simulasi offline. Pasang API Key di Pengaturan untuk mendapatkan respons AI dinamis sesuai proyek Anda!)*`);
        } else if (lower.includes('overview')) {
          resolve(`Saya telah memperbarui bagian Overview untuk Anda!

<UPDATE_PRD>
# PRD — Aplikasi Baru

## 1. Overview
Aplikasi ini dirancang untuk memecahkan masalah efisiensi operasional pada bisnis lokal. Sistem mempermudah interaksi antara pemilik bisnis dan pelanggan melalui antarmuka web yang sederhana dan responsif.

**Masalah utama:**
- Pencatatan manual yang lambat dan rentan kesalahan.
- Pelanggan kesulitan melihat informasi ketersediaan secara real-time.

**Tujuan:**
- Digitalisasi pencatatan transaksi.
- Memberikan transparansi status bagi pelanggan.

## 2. Requirements
- Fitur 1
- Fitur 2
</UPDATE_PRD>

*(Catatan: Anda sedang menggunakan mode simulasi offline. Pasang API Key di Pengaturan untuk mendapatkan respons AI dinamis sesuai proyek Anda!)*`);
        } else {
          resolve(`Saya menerima input Anda: "${prompt}"

Saat ini asisten berjalan dalam **Mode Simulasi**. Untuk melakukan brainstorming riil, silakan pilih AI Provider dan masukkan API Key di menu Pengaturan.

**Tips membuat PRD berkualitas:**
1. Rinci target pengguna dan masalah utama.
2. Buat skema database yang efisien.
3. Gambarkan diagram alur menggunakan Mermaid.js.`);
        }
      }, 1000);
    });
  };

  const handleSend = async (e, customPrompt = '', mode = 'default') => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim() || isLoading) return;

    let userMessageText = promptToSend;
    if (mode === 'grill') userMessageText = '🔥 Tolong uji kritis (Grill) PRD saya!';
    if (mode === 'issues') userMessageText = '📋 Tolong pecah PRD ini menjadi daftar tugas (To Issues)!';

    const userMessage = { role: 'user', text: userMessageText };
    setMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    // Get current chat history (excluding the one we just added)
    const history = [...messages];

    const apiPrompt = mode === 'grill' ? 'Tolong Grill PRD ini.' : mode === 'issues' ? 'Tolong pecah PRD ini menjadi tiket tugas.' : promptToSend;
    const reply = await callGemini(apiPrompt, history, mode);
    
    let chatReply = reply;
    const updateMatch = reply.match(/<UPDATE_PRD>([\s\S]*?)<\/UPDATE_PRD>/);
    if (updateMatch && onUpdateDocument) {
      const newContent = updateMatch[1].trim();
      onUpdateDocument(newContent);
      chatReply = reply.replace(/<UPDATE_PRD>[\s\S]*?<\/UPDATE_PRD>/, "\n\n*[✨ Berhasil: Dokumen telah diperbarui secara otomatis di Editor]*").trim();
    }
    
    setMessages(prev => [...prev, { role: 'model', text: chatReply }]);
    setIsLoading(false);
  };

  const extractCodeBlocks = (text) => {
    const regex = /```(mermaid|markdown|json|sql)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        lang: match[1] || 'text',
        code: match[2].trim()
      });
    }
    return blocks;
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border-l border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-white">AI Copilot Brainstorming</span>
        </div>
        {!apiKey && (
          <button
            onClick={openSettings}
            className="flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded border border-amber-500/20 hover:bg-amber-500/20 transition-all"
          >
            <Key className="w-3 h-3" /> Setup Key
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => {
          const codeBlocks = extractCodeBlocks(m.text);
          return (
            <div
              key={idx}
              className={`flex flex-col gap-1 max-w-[85%] ${
                m.role === 'user' ? 'self-end ml-auto' : 'self-start mr-auto'
              }`}
            >
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/50'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>

                {/* Render code helper inside message if blocks are found */}
                {codeBlocks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-2">
                    <p className="text-[10px] text-indigo-300 font-medium">Potongan Kode Ditemukan:</p>
                    {codeBlocks.map((block, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={() => onInsertText(block.code)}
                        className="flex items-center justify-between w-full p-2 bg-slate-900 border border-slate-700 rounded text-left text-[11px] text-slate-300 hover:border-indigo-500 hover:text-white transition-all group"
                      >
                        <span className="font-mono text-indigo-400">
                          [{block.lang.toUpperCase()}] Klik untuk Sisipkan ke PRD
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-2 items-center text-slate-400 text-xs pl-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>AI sedang berpikir...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Prompts */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleSend(null, 'Grill me', 'grill')}
          disabled={isLoading}
          className="shrink-0 px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 disabled:opacity-50 text-[10px] rounded border border-rose-600/30 font-semibold transition-colors flex items-center gap-1 shadow-[0_0_8px_rgba(225,29,72,0.3)]"
        >
          🔥 Grill My PRD
        </button>
        <button
          onClick={() => handleSend(null, 'To Issues', 'issues')}
          disabled={isLoading}
          className="shrink-0 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 disabled:opacity-50 text-[10px] rounded border border-blue-600/30 font-semibold transition-colors flex items-center gap-1 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
        >
          📋 To-Issues
        </button>
        <div className="w-[1px] bg-slate-800 shrink-0 mx-1" />
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(null, s.prompt)}
            disabled={isLoading}
            className="shrink-0 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-[10px] rounded border border-slate-750 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis ide atau pertanyaan brainstorming..."
          disabled={isLoading}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-55"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
