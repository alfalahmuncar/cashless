import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import codeGsRaw from '../../Code.gs?raw';
import bloggerHtmlRaw from '../../blogger-standalone.html?raw';
import panduanRaw from '../../PANDUAN_DEPLOY.md?raw';

interface ExportCodePanelProps {
  onBackHome: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const ExportCodePanel: React.FC<ExportCodePanelProps> = ({
  onBackHome,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'blogger' | 'codegs' | 'guide'>('blogger');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onNotify(`${label} berhasil disalin ke clipboard.`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      onNotify('Gagal menyalin otomatis. Silakan blok manual di kotak kode.', 'error');
    }
  };

  const handleDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            0205. Ekspor Template Blogger &amp; Panduan
          </h2>
          <p className="text-xs text-slate-500">
            Salin atau unduh berkas template HTML Blogger dan skrip pendukung.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackHome}
          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700"
        >
          Kembali ke Beranda
        </button>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg w-fit mb-5">
          {[
            { id: 'blogger', label: 'HTML Blogger' },
            { id: 'codegs', label: 'Code.gs (Opsional)' },
            { id: 'guide', label: 'Panduan' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[#0b3b8c] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'blogger' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-600">
                Salin dan tempelkan ke tab <strong>HTML View</strong> Postingan atau Halaman Blogger Anda (terisolasi dalam <code className="font-mono">#cashless-app-root</code>).
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('blogger', bloggerHtmlRaw, 'HTML Blogger')}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  {copiedKey === 'blogger' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Salin HTML Blogger
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('blogger-cashless-lembaga.html', bloggerHtmlRaw, 'text/html;charset=utf-8')}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh HTML
                </button>
              </div>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-auto max-h-[420px] leading-relaxed">
              {bloggerHtmlRaw}
            </pre>
          </div>
        )}

        {activeTab === 'codegs' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-600">
                Skrip Apps Script cadangan jika Anda tetap mengoperasikan versi Blogger + Google Sheets secara terpisah.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('codegs', codeGsRaw, 'Code.gs')}
                  className="px-3 py-1.5 bg-[#0a3b8c] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  {copiedKey === 'codegs' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Salin Code.gs
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('Code.gs', codeGsRaw, 'text/plain;charset=utf-8')}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </button>
              </div>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-auto max-h-[420px] leading-relaxed">
              {codeGsRaw}
            </pre>
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[450px] overflow-auto">
            {panduanRaw}
          </div>
        )}
      </div>
    </div>
  );
};
