# Aplikasi PRD Maker

Aplikasi web untuk membuat dan mengelola **Product Requirement Document (PRD)** dengan bantuan AI Copilot berbasis Google Gemini. Dilengkapi dengan editor Markdown, live preview, dukungan diagram Mermaid, dan fitur ekspor PDF.

## ✨ Fitur Utama

- 📝 **Editor Markdown** — Tulis PRD dengan format Markdown lengkap (bold, italic, code, dll.)
- 👁️ **Live Preview** — Lihat hasil render PRD secara real-time dengan mode split view
- 🤖 **AI Copilot (Gemini)** — Generate dan perbaiki konten PRD secara otomatis menggunakan Google Gemini API
- 📊 **Diagram Mermaid** — Buat diagram flowchart, sequence diagram, dll. langsung di dalam PRD
- 📄 **Ekspor PDF** — Unduh PRD dalam format PDF
- 🔐 **Autentikasi** — Sistem login untuk mengamankan akses
- 📁 **Multi-dokumen** — Kelola beberapa PRD sekaligus dengan sidebar navigasi

## 🛠️ Tech Stack

| Teknologi | Keterangan |
|-----------|------------|
| [React](https://react.dev/) | Library UI |
| [Vite](https://vite.dev/) | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS framework |
| [Marked](https://marked.js.org/) | Markdown parser |
| [Mermaid](https://mermaid.js.org/) | Diagram renderer |
| [Lucide React](https://lucide.dev/) | Icon library |
| [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/) | Ekspor ke PDF |

## 📋 Prasyarat

Pastikan perangkat Anda sudah terinstal:

- **[Node.js](https://nodejs.org/)** versi 18 atau lebih baru
- **npm** (sudah termasuk saat menginstal Node.js)
- **Google Gemini API Key** (untuk fitur AI Copilot — opsional)

> Untuk mengecek versi Node.js dan npm yang terinstal, jalankan:
> ```bash
> node -v
> npm -v
> ```

## 🚀 Cara Menjalankan Aplikasi

### 1. Clone Repository

```bash
git clone <url-repository-anda>
cd aplikasi-prd-maker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di **http://localhost:5173** (default Vite). Buka URL tersebut di browser Anda.

### 4. (Opsional) Konfigurasi AI Copilot

Setelah aplikasi berjalan, masukkan **Google Gemini API Key** melalui menu Settings di dalam aplikasi untuk mengaktifkan fitur AI Copilot.

## 📦 Script yang Tersedia

| Perintah | Keterangan |
|----------|------------|
| `npm run dev` | Menjalankan development server dengan hot reload |
| `npm run build` | Build aplikasi untuk production ke folder `dist/` |
| `npm run preview` | Preview hasil build production secara lokal |
| `npm run lint` | Jalankan linter (Oxlint) untuk mengecek kualitas kode |

## 📁 Struktur Proyek

```
aplikasi-prd-maker/
├── public/              # File statis
├── src/
│   ├── components/
│   │   ├── AICopilot.jsx       # Komponen AI Copilot (Gemini)
│   │   ├── AuthScreen.jsx      # Komponen halaman autentikasi
│   │   ├── GeminiSettings.jsx  # Komponen pengaturan Gemini API
│   │   └── MermaidRenderer.jsx # Komponen render diagram Mermaid
│   ├── App.jsx          # Komponen utama aplikasi
│   ├── index.css        # Stylesheet utama
│   └── main.jsx         # Entry point React
├── index.html           # HTML template
├── package.json         # Konfigurasi project & dependencies
├── vite.config.js       # Konfigurasi Vite
├── tailwind.config.js   # Konfigurasi Tailwind CSS
└── postcss.config.js    # Konfigurasi PostCSS
```
