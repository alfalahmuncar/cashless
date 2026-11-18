import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { formatRupiah } from '../services/cashlessApi';
import { InstitutionSettings, Transaksi } from '../types';

interface ReceiptModalProps {
  transaksi: Transaksi | null;
  settings: InstitutionSettings;
  onClose: () => void;
}

type ThermalPaperWidth = '58mm' | '80mm';

const PAPER_STORAGE_KEY = 'alazhar_thermal_paper';
const AUTO_CLOSE_STORAGE_KEY = 'alazhar_thermal_autoclose';

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaksi, settings, onClose }) => {
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>(() => {
    const saved = localStorage.getItem(PAPER_STORAGE_KEY);
    return saved === '80mm' ? '80mm' : '58mm';
  });
  const [autoCloseAfterPrint, setAutoCloseAfterPrint] = useState<boolean>(() => {
    return localStorage.getItem(AUTO_CLOSE_STORAGE_KEY) !== 'false';
  });
  const printBtnRef = useRef<HTMLButtonElement>(null);

  const handlePaperChange = (width: ThermalPaperWidth) => {
    setPaperWidth(width);
    localStorage.setItem(PAPER_STORAGE_KEY, width);
  };

  const handleAutoCloseChange = (checked: boolean) => {
    setAutoCloseAfterPrint(checked);
    localStorage.setItem(AUTO_CLOSE_STORAGE_KEY, String(checked));
  };

  const handleQuickPrint = useCallback(() => {
    if (!transaksi) return;
    const handleAfterPrint = () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      if (autoCloseAfterPrint) {
        onClose();
      }
    };
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
  }, [transaksi, autoCloseAfterPrint, onClose]);

  useEffect(() => {
    if (!transaksi) return;
    printBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleQuickPrint();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [transaksi, onClose, handleQuickPrint]);

  if (!transaksi) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Struk Digital Transaksi</h3>
            <p className="text-[11px] text-slate-500">
              Siap cetak thermal ({paperWidth}) · Tekan Enter atau Ctrl+P
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup struk"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Pengaturan Cepat Printer Thermal */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Kertas:</span>
              <div className="inline-flex p-0.5 bg-slate-200/80 rounded-md">
                {(['58mm', '80mm'] as ThermalPaperWidth[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handlePaperChange(w)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                      paperWidth === w
                        ? 'bg-white text-[#0b3b8c] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <label className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCloseAfterPrint}
                onChange={(e) => handleAutoCloseChange(e.target.checked)}
                className="rounded border-slate-300 accent-[#0a3b8c]"
              />
              Tutup otomatis usai cetak
            </label>
          </div>

          {/* Preview Area Struk Thermal */}
          <div className="flex justify-center">
            <div
              id="cashless-receipt-printable"
              data-paper={paperWidth}
              className={`font-mono text-xs border border-dashed border-slate-400 rounded-lg p-4 bg-slate-50 space-y-1.5 w-full ${
                paperWidth === '58mm' ? 'max-w-[270px]' : 'max-w-[340px]'
              }`}
            >
              <div className="text-center border-b border-dashed border-slate-400 pb-2.5 mb-2.5">
                {settings.logo_url && (
                  <img
                    src={settings.logo_url}
                    alt={settings.nama_lembaga}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 object-contain mx-auto mb-1"
                  />
                )}
                <div className="text-sm font-extrabold text-slate-900">{settings.nama_lembaga}</div>
                {settings.nama_unit && (
                  <div className="text-[11px] font-semibold text-slate-700">{settings.nama_unit}</div>
                )}
                {(settings.alamat || settings.kota) && (
                  <div className="text-[11px] text-slate-700">{settings.alamat || settings.kota}</div>
                )}
                {settings.telepon && (
                  <div className="text-[10.5px] text-slate-600">Telp: {settings.telepon}</div>
                )}
                <div className="text-[11px] text-slate-500 mt-1">BUKTI TRANSAKSI CASHLESS</div>
              </div>

              <div className="flex justify-between gap-2">
                <span className="text-slate-600">No. Trx</span>
                <strong className="text-slate-900 text-right">{transaksi.id_transaksi}</strong>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Waktu</span>
                <span className="text-slate-900 text-right">{transaksi.tanggal_waktu}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Santri</span>
                <strong className="text-slate-900 text-right">{transaksi.nama_santri}</strong>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">NIS</span>
                <span className="text-slate-900 text-right">{transaksi.nis}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Jenis</span>
                <strong className="text-slate-900 text-right">{transaksi.jenis_transaksi}</strong>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Nominal</span>
                <strong className="text-slate-900 text-right">{formatRupiah(transaksi.nominal)}</strong>
              </div>

              <div className="flex justify-between gap-2 border-t border-dashed border-slate-400 pt-2 mt-2">
                <span className="text-slate-800 font-semibold">Saldo Akhir</span>
                <strong className="text-emerald-700 text-sm text-right">
                  {formatRupiah(transaksi.saldo_akhir)}
                </strong>
              </div>

              <div className="pt-2 text-[11px] text-slate-600 border-t border-dashed border-slate-300 space-y-0.5">
                <div>Petugas: {transaksi.petugas}</div>
                <div>Ket: {transaksi.keterangan}</div>
                <div className="text-center pt-2 text-[10px] text-slate-500">
                  {settings.footer_struk || 'Terima kasih · Simpan sebagai bukti transaksi sah'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              ref={printBtnRef}
              type="button"
              onClick={handleQuickPrint}
              className="flex-1 min-h-[42px] px-4 py-2 bg-[#0a3b8c] hover:bg-[#07265c] text-white text-xs font-bold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Quick Print ({paperWidth})
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
