import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Sparkles, RefreshCw, Copy, Check, ChevronDown, ChevronRight, 
  CheckCircle2, Circle, AlertCircle, Clock, Layers, ClipboardList, Download
} from 'lucide-react';
import { marked } from 'marked';

/**
 * WorkflowMode — Replaces editor+preview with a workflow view.
 * AI breaks down the PRD into Epics & Tasks with interactive checkboxes.
 */
export default function WorkflowMode({ 
  prdContent, 
  docId, 
  onExitWorkflow 
}) {
  const [epics, setEpics] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collapsedEpics, setCollapsedEpics] = useState({});
  const scrollRef = useRef(null);

  // Load saved workflow data for this document
  useEffect(() => {
    const saved = localStorage.getItem(`workflow_${docId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEpics(parsed);
        setHasGenerated(true);
      } catch (e) {
        console.error('Failed to load workflow data', e);
      }
    } else {
      setEpics([]);
      setHasGenerated(false);
    }
  }, [docId]);

  // Save workflow data whenever epics change
  useEffect(() => {
    if (epics.length > 0) {
      localStorage.setItem(`workflow_${docId}`, JSON.stringify(epics));
    }
  }, [epics, docId]);

  // Parse AI response text into structured epics/tasks
  const parseAIResponse = (text) => {
    const epics = [];
    const lines = text.split('\n');
    let currentEpic = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Match Epic headers: ### 📌 Epic: Name or ### Epic: Name or ## Epic: Name
      const epicMatch = trimmed.match(/^#{2,3}\s*(?:📌\s*)?(?:Epic[:\s]*|🏗️\s*|🔧\s*|🎨\s*|🔐\s*|📊\s*|🚀\s*|💳\s*|📱\s*|⚙️\s*)?(.+)/i);
      if (epicMatch) {
        currentEpic = {
          id: `epic-${Date.now()}-${epics.length}`,
          title: epicMatch[1].replace(/\*\*/g, '').trim(),
          tasks: []
        };
        epics.push(currentEpic);
        continue;
      }

      // Match task items: - [ ] Task text or - Task text  
      const taskMatch = trimmed.match(/^[-*]\s*(?:\[[ x]?\]\s*)?(.+)/i);
      if (taskMatch && currentEpic) {
        const taskText = taskMatch[1].trim();
        // Skip empty or very short tasks
        if (taskText.length < 3) continue;
        
        // Infer priority from keywords
        let priority = 'medium';
        const lower = taskText.toLowerCase();
        if (lower.includes('kritis') || lower.includes('critical') || lower.includes('keamanan') || lower.includes('security') || lower.includes('autentikasi') || lower.includes('auth') || lower.includes('database') || lower.includes('utama') || lower.includes('core')) {
          priority = 'high';
        } else if (lower.includes('opsional') || lower.includes('optional') || lower.includes('dokumentasi') || lower.includes('doc') || lower.includes('polish') || lower.includes('minor') || lower.includes('enhancement') || lower.includes('optimasi')) {
          priority = 'low';
        }

        currentEpic.tasks.push({
          id: `task-${Date.now()}-${currentEpic.tasks.length}-${Math.random().toString(36).slice(2, 6)}`,
          text: taskText.replace(/\*\*/g, ''),
          done: false,
          priority
        });
      }
    }

    return epics;
  };

  // Call AI to generate workflow
  const handleGenerate = async () => {
    setIsGenerating(true);

    const currentProvider = localStorage.getItem('ai_provider') || 'gemini';
    const apiKey = localStorage.getItem(`${currentProvider}_api_key`) || localStorage.getItem('gemini_api_key') || '';
    const model = localStorage.getItem(`${currentProvider}_model`) || (currentProvider === 'gemini' ? localStorage.getItem('gemini_model') : '');

    const systemPrompt = `Anda adalah Technical Project Manager dan Scrum Master berpengalaman.
Tugas Anda adalah membaca PRD berikut dan memecahnya menjadi daftar tugas pengembangan (Issues/Tickets) yang terstruktur.

STRATEGI PENGEMBANGAN: FRONTEND-FIRST
Susun workflow dalam 2 fase utama:
- **FASE 1 — FRONTEND**: Fokus selesaikan semua UI/UX, komponen, halaman, navigasi, state management, dan tampilan dengan data dummy/mock terlebih dahulu. Pastikan frontend sudah optimal, responsif, dan polished sebelum lanjut ke fase 2.
- **FASE 2 — BACKEND & INTEGRASI**: Setelah frontend selesai, baru implementasi backend (API, database, autentikasi, business logic) dan integrasikan dengan frontend yang sudah jadi.

ATURAN FORMAT WAJIB:
1. Kelompokkan tugas ke dalam Epic (grup besar fitur).
2. Gunakan format heading "### 📌 Epic: [Nama Epic]" untuk setiap epic.
3. Tandai fase di nama Epic, contoh: "### 📌 Epic: [FASE 1] Setup & Layout Frontend" atau "### 📌 Epic: [FASE 2] API & Database".
4. Di bawah setiap Epic, buat daftar tugas menggunakan "- [ ] Deskripsi tugas".
5. Setiap tugas harus spesifik, actionable, dan bisa di-assign ke satu developer.
6. Buat minimal 3-7 tugas per Epic.
7. Buat minimal 3 Epic untuk FASE 1 (Frontend) dan minimal 2 Epic untuk FASE 2 (Backend).
8. FASE 1 harus muncul SEBELUM FASE 2.
9. Untuk tugas frontend, gunakan data dummy/mock sebagai placeholder.

Konteks dokumen PRD:
"""
${prdContent.slice(0, 4000)}
"""

Pecah PRD di atas menjadi daftar tugas pengembangan yang terstruktur sekarang, dengan pendekatan FRONTEND-FIRST.`;

    try {
      let responseText = '';

      if (!apiKey) {
        // Simulation mode
        await new Promise(r => setTimeout(r, 1500));
        responseText = generateSimulatedWorkflow(prdContent);
      } else if (currentProvider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/${model || 'models/gemini-1.5-flash'}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }]
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Gemini API error');
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else if (currentProvider === 'openrouter' || currentProvider === 'groq') {
        const url = currentProvider === 'openrouter' 
          ? 'https://openrouter.ai/api/v1/chat/completions' 
          : 'https://api.groq.com/openai/v1/chat/completions';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || (currentProvider === 'openrouter' ? 'anthropic/claude-3-haiku' : 'llama3-8b-8192'),
            messages: [
              { role: 'system', content: 'Anda adalah Technical Project Manager.' },
              { role: 'user', content: systemPrompt }
            ]
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || `${currentProvider} API error`);
        responseText = data.choices?.[0]?.message?.content || '';
      }

      const parsed = parseAIResponse(responseText);
      if (parsed.length === 0) {
        // Fallback: if parsing fails, create a single epic with the raw text
        setEpics([{
          id: `epic-fallback-${Date.now()}`,
          title: 'Daftar Tugas',
          tasks: [{ id: `task-fb-1`, text: 'Gagal mem-parse respons AI. Coba generate ulang.', done: false, priority: 'medium' }]
        }]);
      } else {
        setEpics(parsed);
      }
      setHasGenerated(true);
    } catch (err) {
      console.error('Workflow generation error:', err);
      setEpics([{
        id: `epic-error-${Date.now()}`,
        title: 'Error',
        tasks: [{ id: `task-err-1`, text: `Gagal generate workflow: ${err.message}`, done: false, priority: 'high' }]
      }]);
      setHasGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  };

  // Simulated workflow for demo without API key — Frontend-First strategy
  const generateSimulatedWorkflow = (content) => {
    const lower = content.toLowerCase();
    let result = '';

    // ═══════════════════════════════════
    // FASE 1 — FRONTEND
    // ═══════════════════════════════════

    result += `### 📌 Epic: [FASE 1] Setup & Layout Frontend\n`;
    result += `- [ ] Inisialisasi repository dan struktur folder proyek\n`;
    result += `- [ ] Setup framework frontend (React/Next.js) dan routing\n`;
    result += `- [ ] Konfigurasi styling (Tailwind CSS / design system)\n`;
    result += `- [ ] Buat layout utama (navbar, sidebar, footer)\n`;
    result += `- [ ] Buat halaman-halaman kosong sesuai sitemap PRD\n`;
    result += `- [ ] Setup linting, formatting, dan commit hooks\n\n`;

    if (lower.includes('auth') || lower.includes('login') || lower.includes('user')) {
      result += `### 📌 Epic: [FASE 1] UI Autentikasi & Profil\n`;
      result += `- [ ] Buat UI halaman login (form, validasi visual)\n`;
      result += `- [ ] Buat UI halaman registrasi\n`;
      result += `- [ ] Buat UI halaman lupa password\n`;
      result += `- [ ] Buat komponen profil user dan pengaturan akun\n`;
      result += `- [ ] Implementasi proteksi route di frontend (guard dengan mock auth)\n`;
      result += `- [ ] Gunakan data dummy user untuk testing flow login\n\n`;
    }

    result += `### 📌 Epic: [FASE 1] Komponen UI Core Features\n`;
    result += `- [ ] Buat komponen UI reusable (button, card, modal, table, form input)\n`;
    result += `- [ ] Buat halaman utama / dashboard dengan data dummy\n`;
    result += `- [ ] Buat halaman list/detail sesuai fitur utama PRD\n`;
    result += `- [ ] Implementasi state management (context/store) dengan mock data\n`;
    result += `- [ ] Implementasi validasi form dan feedback error di UI\n`;
    result += `- [ ] Pastikan semua halaman responsif (mobile, tablet, desktop)\n\n`;

    if (lower.includes('booking') || lower.includes('jadwal') || lower.includes('schedule')) {
      result += `### 📌 Epic: [FASE 1] UI Booking & Kalender\n`;
      result += `- [ ] Buat komponen kalender dan pemilihan slot waktu\n`;
      result += `- [ ] Buat UI form booking dengan validasi visual\n`;
      result += `- [ ] Buat halaman konfirmasi booking\n`;
      result += `- [ ] Buat tampilan daftar booking (list view) dengan data dummy\n`;
      result += `- [ ] Implementasi status badge (pending, confirmed, cancelled)\n\n`;
    }

    if (lower.includes('payment') || lower.includes('bayar') || lower.includes('pembayaran')) {
      result += `### 📌 Epic: [FASE 1] UI Pembayaran\n`;
      result += `- [ ] Buat halaman instruksi pembayaran (info rekening/QRIS)\n`;
      result += `- [ ] Buat form upload bukti pembayaran\n`;
      result += `- [ ] Buat tampilan status pembayaran (pending/verified)\n`;
      result += `- [ ] Buat halaman riwayat transaksi dengan data dummy\n\n`;
    }

    result += `### 📌 Epic: [FASE 1] UI Dashboard & Reporting\n`;
    result += `- [ ] Buat layout halaman dashboard admin\n`;
    result += `- [ ] Buat komponen chart/grafik statistik dengan data dummy\n`;
    result += `- [ ] Buat tabel ringkasan data dengan sorting dan filter\n`;
    result += `- [ ] Buat UI ekspor laporan (tombol download CSV/PDF)\n\n`;

    result += `### 📌 Epic: [FASE 1] Polish & Optimasi Frontend\n`;
    result += `- [ ] Review semua halaman untuk konsistensi desain\n`;
    result += `- [ ] Tambahkan micro-animation dan transisi halaman\n`;
    result += `- [ ] Implementasi loading skeleton dan empty state\n`;
    result += `- [ ] Optimasi performa frontend (lazy loading, code splitting)\n`;
    result += `- [ ] Testing responsif di berbagai ukuran layar\n\n`;

    // ═══════════════════════════════════
    // FASE 2 — BACKEND & INTEGRASI
    // ═══════════════════════════════════

    result += `### 📌 Epic: [FASE 2] Setup Backend & Database\n`;
    result += `- [ ] Setup backend framework dan struktur proyek\n`;
    result += `- [ ] Desain dan migrasi schema database sesuai PRD\n`;
    result += `- [ ] Konfigurasi ORM dan koneksi database\n`;
    result += `- [ ] Setup environment variables dan konfigurasi server\n`;
    result += `- [ ] Buat seed data untuk development\n\n`;

    if (lower.includes('auth') || lower.includes('login') || lower.includes('user')) {
      result += `### 📌 Epic: [FASE 2] Backend Autentikasi\n`;
      result += `- [ ] Implementasi API registrasi dan login (JWT/session)\n`;
      result += `- [ ] Integrasi OAuth provider (Google)\n`;
      result += `- [ ] Buat middleware proteksi route backend\n`;
      result += `- [ ] Ganti mock auth di frontend dengan API auth asli\n`;
      result += `- [ ] Implementasi fitur reset password via email\n\n`;
    }

    result += `### 📌 Epic: [FASE 2] API Core & Integrasi Frontend\n`;
    result += `- [ ] Buat API endpoint CRUD untuk fitur utama\n`;
    result += `- [ ] Ganti semua data dummy di frontend dengan API call\n`;
    result += `- [ ] Implementasi error handling dan response standar\n`;
    result += `- [ ] Implementasi validasi data di backend\n`;
    result += `- [ ] Buat API documentation (Swagger/OpenAPI)\n\n`;

    result += `### 📌 Epic: [FASE 2] Testing & Deployment\n`;
    result += `- [ ] Tulis unit test backend (API endpoint)\n`;
    result += `- [ ] Tulis integration test (frontend ↔ backend)\n`;
    result += `- [ ] Lakukan user acceptance testing (UAT)\n`;
    result += `- [ ] Setup CI/CD pipeline\n`;
    result += `- [ ] Deploy ke staging lalu production server\n`;
    result += `- [ ] Dokumentasi API dan user guide\n`;

    return result;
  };

  // Toggle task completion
  const handleToggleTask = (epicId, taskId) => {
    setEpics(prev => prev.map(epic => {
      if (epic.id === epicId) {
        return {
          ...epic,
          tasks: epic.tasks.map(task => 
            task.id === taskId ? { ...task, done: !task.done } : task
          )
        };
      }
      return epic;
    }));
  };

  // Toggle epic collapse
  const toggleEpicCollapse = (epicId) => {
    setCollapsedEpics(prev => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  // Calculate progress
  const getEpicProgress = (epic) => {
    if (epic.tasks.length === 0) return 0;
    return Math.round((epic.tasks.filter(t => t.done).length / epic.tasks.length) * 100);
  };

  const getTotalProgress = () => {
    const allTasks = epics.flatMap(e => e.tasks);
    if (allTasks.length === 0) return { done: 0, total: 0, percent: 0 };
    const done = allTasks.filter(t => t.done).length;
    return { done, total: allTasks.length, percent: Math.round((done / allTasks.length) * 100) };
  };

  // Copy all tasks as markdown
  const handleCopyAll = () => {
    let md = '# Workflow — Daftar Tugas\n\n';
    epics.forEach(epic => {
      md += `### 📌 Epic: ${epic.title}\n`;
      epic.tasks.forEach(task => {
        md += `- [${task.done ? 'x' : ' '}] ${task.text}\n`;
      });
      md += '\n';
    });
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download all tasks as markdown file
  const handleDownloadWorkflow = () => {
    let md = '# Workflow — Daftar Tugas\n\n';
    epics.forEach(epic => {
      md += `### 📌 Epic: ${epic.title}\n`;
      epic.tasks.forEach(task => {
        md += `- [${task.done ? 'x' : ' '}] ${task.text}\n`;
      });
      md += '\n';
    });
    
    const element = document.createElement("a");
    const file = new Blob([md], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `workflow-tasks-${docId}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Render PRD summary (left panel) — strip mermaid blocks for cleaner view
  const renderPrdSummary = () => {
    const cleanContent = prdContent.replace(/```mermaid[\s\S]*?```/g, '\n*(diagram)*\n');
    return marked.parse(cleanContent);
  };

  const total = getTotalProgress();
  const priorityLabel = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden animate-fade-in">
      
      {/* Workflow Top Bar */}
      <div className="h-14 border-b border-slate-850 bg-slate-900/60 backdrop-blur px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitWorkflow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition-colors border border-slate-750"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Editor</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">Workflow Mode</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasGenerated && (
            <>
              {/* Total progress indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-850 rounded-lg border border-slate-750 text-xs">
                <span className="text-slate-400">{total.done}/{total.total} tugas</span>
                <div className="w-20 workflow-progress-bar">
                  <div 
                    className={`workflow-progress-fill ${total.percent === 100 ? 'complete' : ''}`}
                    style={{ width: `${total.percent}%` }}
                  />
                </div>
                <span className={`font-semibold ${total.percent === 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  {total.percent}%
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition-colors border border-slate-750"
                  title="Salin ke Clipboard"
                >
                  {copied ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Tersalin!</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /><span>Salin</span></>
                  )}
                </button>
                <button
                  onClick={handleDownloadWorkflow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition-colors border border-slate-750"
                  title="Unduh file .md"
                >
                  <Download className="w-3.5 h-3.5" /><span>Unduh</span>
                </button>
              </div>
            </>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-indigo-600/15"
          >
            {isGenerating ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Generating...</span></>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /><span>{hasGenerated ? 'Generate Ulang' : 'Generate Workflow'}</span></>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel — PRD Summary */}
        <div className="w-[340px] shrink-0 border-r border-slate-850 bg-slate-900/30 overflow-y-auto p-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
            <ClipboardList className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Ringkasan PRD</span>
          </div>
          <div 
            className="workflow-summary-prose"
            dangerouslySetInnerHTML={{ __html: renderPrdSummary() }}
          />
        </div>

        {/* Right Panel — Workflow Tasks */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950" ref={scrollRef}>
          
          {!hasGenerated && !isGenerating && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              <div className="p-4 bg-indigo-500/10 rounded-2xl mb-5">
                <Layers className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Siap Membuat Workflow?</h2>
              <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                AI akan menganalisis PRD Anda dan memecahnya menjadi daftar tugas pengembangan 
                yang terstruktur per Epic. Klik tombol di bawah untuk memulai.
              </p>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4" />
                Generate Workflow
              </button>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              <div className="p-4 bg-indigo-500/10 rounded-2xl mb-5 animate-pulse">
                <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Menganalisis PRD...</h2>
              <p className="text-sm text-slate-400">AI sedang memecah dokumen menjadi daftar tugas</p>
            </div>
          )}

          {hasGenerated && !isGenerating && (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  Daftar Tugas — {epics.length} Epic
                </h2>
              </div>

              {/* Epic Cards */}
              {epics.map((epic, epicIdx) => {
                const progress = getEpicProgress(epic);
                const isCollapsed = collapsedEpics[epic.id];
                const completedTasks = epic.tasks.filter(t => t.done).length;

                return (
                  <div 
                    key={epic.id} 
                    className="workflow-epic-card p-4 animate-slide-in-up"
                    style={{ animationDelay: `${epicIdx * 80}ms` }}
                  >
                    {/* Epic Header */}
                    <button 
                      onClick={() => toggleEpicCollapse(epic.id)}
                      className="w-full flex items-center justify-between mb-3 group"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                        )}
                        <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          📌 {epic.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {completedTasks}/{epic.tasks.length}
                        </span>
                        <div className="w-16 workflow-progress-bar">
                          <div 
                            className={`workflow-progress-fill ${progress === 100 ? 'complete' : ''}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {progress === 100 && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                    </button>

                    {/* Tasks List */}
                    {!isCollapsed && (
                      <div className="space-y-1.5 pl-6">
                        {epic.tasks.map((task, taskIdx) => (
                          <div 
                            key={task.id}
                            className="workflow-task-item flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/40 transition-colors group"
                            style={{ animationDelay: `${(epicIdx * 80) + (taskIdx * 40)}ms` }}
                          >
                            <input
                              type="checkbox"
                              checked={task.done}
                              onChange={() => handleToggleTask(epic.id, task.id)}
                              className="workflow-checkbox mt-0.5"
                            />
                            <span className={`text-xs leading-relaxed flex-1 transition-all ${
                              task.done 
                                ? 'line-through text-slate-600' 
                                : 'text-slate-300'
                            }`}>
                              {task.text}
                            </span>
                            <span className={`priority-${task.priority} text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 uppercase tracking-wide`}>
                              {priorityLabel[task.priority]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
