import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Settings, Sparkles, BookOpen, Trash2, 
  PanelLeftClose, PanelLeft, Split, Eye, Edit3, Save, Copy, 
  Bold, Italic, Code, Database, Share2, Check, LogOut, User, Download
} from 'lucide-react';
import { marked } from 'marked';
import MermaidRenderer from './components/MermaidRenderer';
import AICopilot from './components/AICopilot';
import GeminiSettings from './components/GeminiSettings';
import AuthScreen from './components/AuthScreen';

// Set marked options for security and convenience
marked.setOptions({
  gfm: true,
  breaks: true,
});

const DEFAULT_PRD_TEMPLATE = `# PRD — [Nama Proyek Aplikasi Anda]

## 1. **Overview**
Aplikasi ini adalah...

Masalah utama yang diselesaikan:
- [Tulis masalah pertama]
- [Tulis masalah kedua]

Tujuan utama aplikasi:
- [Tujuan 1]
- [Tujuan 2]

## 2. **Requirements**
- [Kebutuhan fungsional 1]
- [Kebutuhan fungsional 2]
- [Kebutuhan non-fungsional (misal: mobile-friendly, keamanan)]

## 3. **Core Features**
- **[Nama Fitur Utama 1]**
  - Detail sub-fitur.
- **[Nama Fitur Utama 2]**
  - Detail sub-fitur.

## 4. **User Flow**
Berikut diagram alur pengguna:

\`\`\`mermaid
flowchart TD
    A[Customer] --> B[Membuka Halaman]
    B --> C[Mengisi Data]
    C --> D[Selesai]
\`\`\`

## 5. **Architecture**
Desain arsitektur sistem:

\`\`\`mermaid
flowchart TD
    Client[Web Client] --> API[Rest API Service]
    API --> DB[(Database)]
\`\`\`

## 6. **Database Schema**
Struktur tabel database:

\`\`\`mermaid
erDiagram
    USERS ||--o{ POSTS : writes
    USERS {
        string id PK
        string name
        string email
    }
    POSTS {
        string id PK
        string title
        string content
    }
\`\`\`

## 7. **Tech Stack**
- **Frontend / Backend**: Next.js
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL / SQLite
`;

const PADEL_EXAMPLE_CONTENT = `# PRD — Booking Lapangan Padel Multitenant

## 1. **Overview**
Aplikasi ini adalah platform booking lapangan padel berbasis web untuk pemilik venue di Indonesia. Sistem bersifat multitenant, artinya setiap pemilik venue/admin bisnis dapat memiliki akun sendiri, mengelola banyak lapangan, mengatur jadwal ketersediaan, menerima booking dari customer publik, dan memverifikasi pembayaran manual.

Masalah utama yang diselesaikan:
- Pemilik venue masih menerima booking lewat WhatsApp/manual sehingga rawan bentrok jadwal.
- Customer sulit melihat slot lapangan yang tersedia secara real-time.
- Admin venue perlu cara sederhana untuk mengelola lapangan, jadwal, booking, dan status pembayaran.

Tujuan utama aplikasi:
- Menyediakan landing page publik untuk setiap venue.
- Memungkinkan customer booking tanpa login.
- Memberikan dashboard admin untuk pemilik venue mengelola banyak lapangan.
- Mendukung pembayaran manual seperti transfer bank/QRIS dan verifikasi oleh admin.

## 2. **Requirements**
- Sistem harus mendukung banyak tenant/pemilik venue dalam satu aplikasi.
- Setiap tenant dapat memiliki satu atau lebih venue/lokasi bisnis.
- Setiap venue dapat memiliki banyak lapangan padel.
- Customer publik dapat melihat daftar lapangan, jadwal tersedia, harga, dan melakukan booking tanpa membuat akun.
- Booking harus memiliki status yang jelas (pending_payment, confirmed, cancelled, completed).
- Sistem harus mencegah double booking pada lapangan, tanggal, dan jam yang sama.
- Admin tenant dapat login untuk mengelola lapangan, jadwal, harga, booking, dan pembayaran manual.
- Admin dapat mengatur informasi pembayaran manual (rekening bank/QRIS).

## 3. **Core Features**
- **Dashboard Admin Tenant:** Ringkasan booking hari ini, booking mendatang, pendapatan estimasi, dan status verifikasi pembayaran.
- **Halaman Booking Publik:** Memilih venue, lapangan, tanggal, jam, durasi, lalu memasukkan nama dan WhatsApp.
- **Manajemen Jadwal & Slot:** Aturan jam operasional dan durasi slot (60 atau 90 menit).
- **Pembayaran Manual:** Panduan transfer dan form konfirmasi pembayaran.

## 4. **User Flow**
Berikut diagram alur pemesanan lapangan:

\`\`\`mermaid
flowchart TD
    A[Customer Publik] --> B[Halaman Venue Publik]
    B --> C[Pilih Lapangan dan Slot]
    C --> D[Form Booking]
    D --> E[API Booking]
    E --> F[(Database)]
    E --> G[Instruksi Pembayaran Manual]
    
    H[Admin Tenant] --> I[Login Admin]
    I --> J[Dashboard Admin]
    J --> N[Manajemen Booking]
    N --> P[Verifikasi Pembayaran]
    P --> F
\`\`\`

## 5. **Architecture**
Arsitektur aplikasi terisolasi per tenant:

\`\`\`mermaid
flowchart TD
    Client[Web Browser] --> Router[Next.js Router]
    Router --> Services[API Routes]
    Services --> DB[(PostgreSQL Database)]
    Services --> Storage[(S3 Upload Storage)]
\`\`\`

## 6. **Database Schema**
Struktur tabel relational database:

\`\`\`mermaid
erDiagram
    USERS ||--o{ TENANTS : owns
    TENANTS ||--o{ VENUES : has
    VENUES ||--o{ COURTS : has
    TENANTS ||--o{ BOOKINGS : owns

    USERS {
        string id PK
        string name
        string email
    }
    TENANTS {
        string id PK
        string name
        string slug
    }
    VENUES {
        string id PK
        string name
        string address
    }
    BOOKINGS {
        string id PK
        string customer_name
        string status
    }
\`\`\`

## 7. **Tech Stack**
- **Framework:** Next.js
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Better Auth
`;

export default function App() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [editorText, setEditorText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false);
  const [fixMermaidRequest, setFixMermaidRequest] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Renaming state
  const [renamingDocId, setRenamingDocId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCloseSettings = () => {
    setIsSettingsClosing(true);
    setTimeout(() => {
      setShowSettings(false);
      setIsSettingsClosing(false);
    }, 280);
  };

  // Load documents from LocalStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('prd_user');
    if (savedUser) setUser(savedUser);

    const savedDocs = localStorage.getItem('prd_documents');
    if (savedDocs) {
      const parsed = JSON.parse(savedDocs);
      setDocuments(parsed);
      if (parsed.length > 0) {
        setActiveDocId(parsed[0].id);
        setEditorText(parsed[0].content);
      }
    } else {
      // Initialize with default template if empty
      const defaultDocs = [
        {
          id: 'doc-1',
          title: 'PRD Proyek Baru',
          content: DEFAULT_PRD_TEMPLATE,
          updatedAt: new Date().toISOString()
        }
      ];
      setDocuments(defaultDocs);
      setActiveDocId('doc-1');
      setEditorText(DEFAULT_PRD_TEMPLATE);
      localStorage.setItem('prd_documents', JSON.stringify(defaultDocs));
    }
  }, []);

  const handleLogin = (name) => {
    localStorage.setItem('prd_user', name);
    setUser(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('prd_user');
    setUser(null);
  };

  // Save current active document content
  const handleEditorChange = (val) => {
    setEditorText(val);
    setDocuments(prev => {
      const updated = prev.map(doc => {
        if (doc.id === activeDocId) {
          return { ...doc, content: val, updatedAt: new Date().toISOString() };
        }
        return doc;
      });
      localStorage.setItem('prd_documents', JSON.stringify(updated));
      return updated;
    });
  };

  // Change active doc
  const handleSelectDoc = (id) => {
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setActiveDocId(id);
      setEditorText(doc.content);
    }
  };

  // Create new document
  const handleCreateNewDoc = (content = DEFAULT_PRD_TEMPLATE, title = 'PRD Baru') => {
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: `${title} #${documents.length + 1}`,
      content: content,
      updatedAt: new Date().toISOString()
    };
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    setActiveDocId(newDoc.id);
    setEditorText(content);
    localStorage.setItem('prd_documents', JSON.stringify(updated));
  };

  // Rename document
  const handleStartRename = (doc, e) => {
    e.stopPropagation();
    setRenamingDocId(doc.id);
    setRenameValue(doc.title);
  };

  const handleSaveRename = (id, e) => {
    if (e) e.stopPropagation();
    if (renameValue.trim() === '') {
      setRenamingDocId(null);
      return;
    }
    
    setDocuments(prev => {
      const updated = prev.map(doc => {
        if (doc.id === id) {
          return { ...doc, title: renameValue.trim(), updatedAt: new Date().toISOString() };
        }
        return doc;
      });
      localStorage.setItem('prd_documents', JSON.stringify(updated));
      return updated;
    });
    setRenamingDocId(null);
  };

  // Delete document
  const handleDeleteDoc = (id, e) => {
    e.stopPropagation();
    if (documents.length <= 1) {
      alert("Anda harus mempertahankan minimal satu dokumen.");
      return;
    }
    if (confirm("Apakah Anda yakin ingin menghapus PRD ini?")) {
      const updated = documents.filter(d => d.id !== id);
      setDocuments(updated);
      localStorage.setItem('prd_documents', JSON.stringify(updated));
      if (activeDocId === id) {
        setActiveDocId(updated[0].id);
        setEditorText(updated[0].content);
      }
    }
  };

  // Load Padel template example
  const handleLoadPadelTemplate = () => {
    handleCreateNewDoc(PADEL_EXAMPLE_CONTENT, "PRD Booking Padel");
  };

  // Insert text into markdown editor
  const handleInsertText = (textToInsert) => {
    const textarea = document.getElementById('prd-markdown-textarea');
    if (!textarea) {
      // Fallback: append to end
      handleEditorChange(editorText + '\n\n' + textToInsert);
      return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = editorText.substring(0, start);
    const textAfter = editorText.substring(end, editorText.length);
    const newContent = textBefore + '\n' + textToInsert + '\n' + textAfter;
    
    handleEditorChange(newContent);
    // Focus back and set selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length + 2, start + textToInsert.length + 2);
    }, 50);
  };

  // Fix Mermaid request from renderer
  const handleFixMermaid = (chart, error) => {
    setFixMermaidRequest({ chart, error, timestamp: Date.now() });
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(editorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download PRD as Markdown file
  const handleDownload = () => {
    const docTitle = documents.find(d => d.id === activeDocId)?.title || 'PRD';
    const safeTitle = docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const element = document.createElement("a");
    const file = new Blob([editorText], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${safeTitle}.md`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  // Download PRD as PDF file via Native Print
  const handleDownloadPDF = () => {
    const docTitle = documents.find(d => d.id === activeDocId)?.title || 'PRD';
    const oldTitle = document.title;
    document.title = docTitle;
    window.print();
    setTimeout(() => { document.title = oldTitle; }, 1000);
  };

  // Parse markdown into layout blocks containing either markdown text or mermaid diagrams
  const parsePrdBlocks = (text) => {
    const regex = /```mermaid\n([\s\S]*?)```/g;
    const blocks = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({
          type: 'markdown',
          content: text.substring(lastIndex, match.index)
        });
      }
      blocks.push({
        type: 'mermaid',
        content: match[1].trim()
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      blocks.push({
        type: 'markdown',
        content: text.substring(lastIndex)
      });
    }

    return blocks.length > 0 ? blocks : [{ type: 'markdown', content: text }];
  };

  // Toolbar Actions
  const insertToolbarTag = (prefix, suffix = '') => {
    const textarea = document.getElementById('prd-markdown-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = editorText.substring(start, end);
    const replacement = prefix + (selection || 'teks') + suffix;
    handleEditorChange(editorText.substring(0, start) + replacement + editorText.substring(end));
    setTimeout(() => textarea.focus(), 50);
  };

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 print:block print:h-auto print:overflow-visible">
      
      {/* 1. SIDEBAR: Document Management */}
      <div 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } shrink-0 bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col overflow-hidden print:hidden`}
      >
        {/* Title Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white font-bold text-sm shadow-indigo-500/20 shadow-lg">
              P
            </div>
            <span className="font-semibold text-white tracking-wide text-sm">PRD Builder AI</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => handleCreateNewDoc()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/15 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> PRD Baru
          </button>
          
          <button
            onClick={handleLoadPadelTemplate}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-750 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Muat Contoh Padel
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2 py-1">Dokumen PRD</p>
          {documents.map(doc => (
            <div
              key={doc.id}
              onClick={() => {
                if (renamingDocId !== doc.id) handleSelectDoc(doc.id);
              }}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all text-xs ${
                activeDocId === doc.id 
                  ? 'bg-slate-850 border border-slate-750 text-indigo-300 shadow'
                  : 'hover:bg-slate-850/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-indigo-400" />
                {renamingDocId === doc.id ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(doc.id, e);
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setRenamingDocId(null);
                      }
                    }}
                    onBlur={(e) => handleSaveRename(doc.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-white focus:outline-none"
                  />
                ) : (
                  <span className="truncate" title={doc.title}>{doc.title}</span>
                )}
              </div>
              
              {renamingDocId !== doc.id && (
                <div className="flex items-center shrink-0">
                  <button
                    onClick={(e) => handleStartRename(doc, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 mr-1 hover:bg-slate-700 text-slate-500 hover:text-indigo-400 rounded transition-all"
                    title="Ubah Nama"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-700 text-slate-500 hover:text-rose-400 rounded transition-all"
                    title="Hapus"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-1">
          <div className="flex items-center px-3 py-1 mb-1 text-xs text-slate-500 border-b border-slate-800/50 pb-2">
            <User className="w-3.5 h-3.5 mr-2" />
            <span className="truncate">{user}</span>
          </div>
          <button
            onClick={() => {
              if (showSettings) {
                handleCloseSettings();
              } else {
                setShowSettings(true);
              }
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
              showSettings ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan API</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Button to reopen sidebar when collapsed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute left-4 top-4 z-40 p-2 bg-slate-900 border border-slate-800 rounded-lg shadow-lg text-slate-400 hover:text-white hover:bg-slate-800 print:hidden"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      )}

      {/* 2. MIDDLE / MAIN LAYOUT: Editor & Preview */}
      <div className="flex-1 flex flex-col min-w-0 print:block print:w-full print:h-auto print:overflow-visible">
        
        {/* Editor Top Bar */}
        <div className="h-14 border-b border-slate-850 bg-slate-900/60 backdrop-blur px-4 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            {isSidebarOpen ? null : <div className="w-10 h-1" />}
            <span className="text-sm font-semibold text-white">
              {documents.find(d => d.id === activeDocId)?.title || 'Drafting PRD'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition-colors border border-slate-750"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Semua</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition-colors border border-slate-750"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .md</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/50 hover:bg-indigo-800/80 text-indigo-300 rounded-lg text-xs transition-colors border border-indigo-500/30"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>

        {/* Settings Modal/Drawer Overlay */}
        {showSettings && (
          <div className={`p-4 bg-slate-900 border-b border-slate-800 flex justify-center shrink-0 ${isSettingsClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
            <GeminiSettings onKeySaved={handleCloseSettings} />
          </div>
        )}

        {/* Content Area: Split Editor & Preview */}
        <div className="flex-1 flex overflow-hidden print:block print:overflow-visible print:h-auto">
          
          {/* A. Editor Panel */}
          <div className="flex-1 flex flex-col border-r border-slate-850 bg-slate-900/20 print:hidden">
            
            {/* Markdown Toolbar */}
            <div className="px-3 py-2 border-b border-slate-850 bg-slate-900/50 flex items-center gap-2 shrink-0">
              <button 
                onClick={() => insertToolbarTag('**', '**')}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                title="Tebal (Bold)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => insertToolbarTag('*', '*')}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                title="Miring (Italic)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-slate-800 mx-1" />
              <button 
                onClick={() => insertToolbarTag('\n```mermaid\nflowchart TD\n    A[Mulai] --> B[Proses]\n```\n')}
                className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white text-[11px]"
                title="Diagram Alur Mermaid"
              >
                <Code className="w-3 h-3 text-indigo-400" /> Flowchart
              </button>
              <button 
                onClick={() => insertToolbarTag('\n```mermaid\nerDiagram\n    TABEL1 ||--o{ TABEL2 : relasi\n```\n')}
                className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white text-[11px]"
                title="ERD Schema Mermaid"
              >
                <Database className="w-3 h-3 text-emerald-400" /> DB Schema
              </button>
            </div>

            {/* Main Textarea */}
            <textarea
              id="prd-markdown-textarea"
              value={editorText}
              onChange={(e) => handleEditorChange(e.target.value)}
              placeholder="# Tulis PRD di sini menggunakan Markdown..."
              className="flex-1 w-full bg-transparent p-4 text-xs font-mono text-slate-300 resize-none focus:outline-none leading-relaxed overflow-y-auto"
            />
          </div>

          {/* B. Live Preview Panel */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto p-6 print:block print:w-full print:bg-white print:text-black print:overflow-visible print:h-auto print:p-0">
            <div className="max-w-2xl mx-auto w-full print:max-w-none print:w-full print:h-auto print:overflow-visible">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-6 print:hidden">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Live Preview</span>
                <span className="text-[10px] text-slate-500">Mendukung Render Markdown & Mermaid</span>
              </div>
              
              {/* Parse and render blocks sequentially */}
              <div className="prose">
                {parsePrdBlocks(editorText).map((block, idx) => {
                  if (block.type === 'mermaid') {
                    return (
                      <MermaidRenderer 
                        key={idx} 
                        chart={block.content} 
                        onFixError={handleFixMermaid}
                      />
                    );
                  }
                  
                  // Clean render html for safety
                  const html = marked.parse(block.content);
                  return (
                    <div 
                      key={idx} 
                      dangerouslySetInnerHTML={{ __html: html }} 
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RIGHT PANEL: AI Brainstorming Copilot */}
      <div className="w-[360px] shrink-0 h-full print:hidden">
        <AICopilot 
          prdContent={editorText} 
          onInsertText={handleInsertText}
          onUpdateDocument={handleEditorChange}
          fixMermaidRequest={fixMermaidRequest}
          openSettings={() => setShowSettings(true)}
        />
      </div>

    </div>
  );
}
