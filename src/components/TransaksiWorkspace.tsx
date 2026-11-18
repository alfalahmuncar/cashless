import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CreditCard, RotateCcw, Search } from 'lucide-react';
import { callCashlessApi, formatRupiah } from '../services/cashlessApi';
import { JenisTransaksi, Santri, Transaksi, UserAccount } from '../types';

interface TransaksiWorkspaceProps {
  jenis: JenisTransaksi;
  user: UserAccount;
  santriList: Santri[];
  transaksiList: Transaksi[];
  onTransactionCreated: (trx: Transaksi, updatedSantri: Santri) => void;
  onShowReceipt: (trx: Transaksi) => void;
  onBackHome: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const QUICK_AMOUNTS = [2000, 5000, 10000, 15000, 20000, 50000];

export const TransaksiWorkspace: React.FC<TransaksiWorkspaceProps> = ({
  jenis,
  user,
  santriList,
  transaksiList,
  onTransactionCreated,
  onShowReceipt,
  onBackHome,
  onNotify,
}) => {
  const [scanQuery, setScanQuery] = useState('');
  const [selectedNis, setSelectedNis] = useState<string | null>(null);
  const [nominalStr, setNominalStr] = useState('');
  const [keterangan, setKeterangan] = useState(
    jenis === 'Belanja'
      ? 'Belanja Kantin / Koperasi'
      : jenis === 'Top Up'
        ? 'Setoran Saldo Santri'
        : 'Penarikan Uang Saku'
  );
  const [submitting, setSubmitting] = useState(false);

  const scanRef = useRef<HTMLInputElement>(null);
  const nominalRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setKeterangan(
      jenis === 'Belanja'
        ? 'Belanja Kantin / Koperasi'
        : jenis === 'Top Up'
          ? 'Setoran Saldo Santri'
          : 'Penarikan Uang Saku'
    );
    setNominalStr('');
    scanRef.current?.focus();
  }, [jenis]);

  const selectedSantri = useMemo(
    () => santriList.find((s) => s.nis === selectedNis) || null,
    [santriList, selectedNis]
  );

  const searchMatches = useMemo(() => {
    const q = scanQuery.trim().toLowerCase();
    if (!q || selectedSantri) return [];
    return santriList
      .filter(
        (s) =>
          s.nis.toLowerCase().includes(q) ||
          s.nama_santri.toLowerCase().includes(q) ||
          s.rfid_uid.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [scanQuery, santriList, selectedSantri]);

  const handleScanChange = (val: string) => {
    setScanQuery(val);
    const q = val.trim().toLowerCase();
    if (!q) {
      setSelectedNis(null);
      return;
    }
    const exact = santriList.find(
      (s) => s.rfid_uid.toLowerCase() === q || s.nis.toLowerCase() === q
    );
    if (exact) {
      setSelectedNis(exact.nis);
    } else {
      setSelectedNis(null);
    }
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSantri) {
        nominalRef.current?.focus();
      } else if (searchMatches.length === 1) {
        setSelectedNis(searchMatches[0].nis);
        setScanQuery(searchMatches[0].nis);
        nominalRef.current?.focus();
      }
    }
  };

  const nominal = Number(nominalStr || 0);

  const validationError = useMemo(() => {
    if (!selectedSantri) return '';
    if (selectedSantri.status !== 'aktif') {
      return `Kartu santri ${selectedSantri.nama_santri} berstatus NONAKTIF / DIBLOKIR.`;
    }
    if (nominal > 0 && (jenis === 'Belanja' || jenis === 'Tarik Tunai') && nominal > selectedSantri.saldo) {
      return `Saldo tidak mencukupi. Sisa saldo saat ini: ${formatRupiah(selectedSantri.saldo)}.`;
    }
    if (
      nominal > 0 &&
      jenis === 'Belanja' &&
      selectedSantri.limit_harian > 0 &&
      (selectedSantri.terpakai_hari_ini || 0) + nominal > selectedSantri.limit_harian
    ) {
      const sisa = Math.max(0, selectedSantri.limit_harian - (selectedSantri.terpakai_hari_ini || 0));
      return `Melebihi limit belanja harian (${formatRupiah(selectedSantri.limit_harian)}). Sisa limit hari ini: ${formatRupiah(sisa)}.`;
    }
    return '';
  }, [selectedSantri, nominal, jenis]);

  const handleReset = () => {
    setScanQuery('');
    setSelectedNis(null);
    setNominalStr('');
    scanRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) {
      onNotify('Pilih santri terlebih dahulu dengan scan RFID atau ketik NIS.', 'error');
      return;
    }
    if (validationError) {
      onNotify(validationError, 'error');
      return;
    }
    if (!nominal || nominal <= 0) {
      onNotify('Masukkan nominal transaksi yang valid.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await callCashlessApi<{ transaksi: Transaksi; santri: Santri }>(
        'createTransaksi',
        {
          nis: selectedSantri.nis,
          rfid_uid: selectedSantri.rfid_uid,
          jenis_transaksi: jenis,
          nominal,
          petugas: user.nama_petugas,
          keterangan: keterangan.trim() || '-',
        }
      );
      onTransactionCreated(res.transaksi, res.santri);
      onShowReceipt(res.transaksi);
      onNotify(`${jenis} ${formatRupiah(nominal)} untuk ${res.santri.nama_santri} berhasil.`);
      setNominalStr('');
      setScanQuery('');
      setSelectedNis(null);
      scanRef.current?.focus();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal memproses transaksi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const titleByJenis: Record<JenisTransaksi, string> = {
    Belanja: '0321. Transaksi Kasir / Belanja Santri',
    'Top Up': '0322. Top Up Saldo Santri',
    'Tarik Tunai': '0323. Penarikan Tunai Santri',
  };

  const spentToday = selectedSantri?.terpakai_hari_ini || 0;
  const remainingLimit =
    selectedSantri && selectedSantri.limit_harian > 0
      ? Math.max(0, selectedSantri.limit_harian - spentToday)
      : null;

  return (
    <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{titleByJenis[jenis]}</h2>
          <p className="text-xs text-slate-500">
            Tempelkan kartu RFID pada reader atau ketik NIS / Nama Santri untuk memproses transaksi.
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

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Form POS */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 border border-slate-200 rounded-xl p-4 space-y-4">
          <div>
            <label htmlFor="pos-scan-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Scan RFID UID / Ketik NIS atau Nama Santri
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={scanRef}
                id="pos-scan-input"
                type="text"
                value={scanQuery}
                onChange={(e) => handleScanChange(e.target.value)}
                onKeyDown={handleScanKeyDown}
                placeholder="Scan kartu RFID atau ketik NIS (misal: 2026001)..."
                autoComplete="off"
                className="w-full min-h-[44px] pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:border-[#0b3b8c] focus:ring-2 focus:ring-blue-900/10"
              />
            </div>

            {searchMatches.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {searchMatches.map((s) => (
                  <button
                    key={s.nis}
                    type="button"
                    onClick={() => {
                      setSelectedNis(s.nis);
                      setScanQuery(s.nis);
                      nominalRef.current?.focus();
                    }}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-[#0b3b8c]"
                  >
                    {s.nama_santri} ({s.nis})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kartu Info Santri Terpilih */}
          {selectedSantri && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-3.5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#0a3b8c] text-white flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0b3b8c]">{selectedSantri.nama_santri}</div>
                    <div className="text-xs text-slate-600">
                      NIS <span className="font-mono">{selectedSantri.nis}</span> · Kelas {selectedSantri.kelas}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold ${
                    selectedSantri.status === 'aktif' ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {selectedSantri.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <span className="block text-[11px] font-semibold text-slate-500">Sisa Saldo</span>
                  <strong className="font-mono text-sm text-slate-900">{formatRupiah(selectedSantri.saldo)}</strong>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <span className="block text-[11px] font-semibold text-slate-500">Limit Harian</span>
                  <strong className="font-mono text-sm text-slate-900">
                    {selectedSantri.limit_harian > 0 ? formatRupiah(selectedSantri.limit_harian) : 'Tanpa Limit'}
                  </strong>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <span className="block text-[11px] font-semibold text-slate-500">Sisa Limit Hari Ini</span>
                  <strong className="font-mono text-sm text-slate-900">
                    {remainingLimit !== null ? formatRupiah(remainingLimit) : '-'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="pos-nominal" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nominal {jenis} (Rp)
            </label>
            <input
              ref={nominalRef}
              id="pos-nominal"
              type="number"
              min={500}
              step={500}
              value={nominalStr}
              onChange={(e) => setNominalStr(e.target.value)}
              placeholder="Contoh: 10000"
              required
              className="w-full min-h-[46px] px-3 py-2 border border-slate-300 rounded-lg font-mono text-lg font-bold text-slate-900 focus:outline-none focus:border-[#0b3b8c]"
            />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setNominalStr(String(amt))}
                  className="min-h-[36px] px-2 bg-slate-50 hover:bg-blue-50 border border-slate-300 hover:border-[#0b3b8c] rounded-lg text-xs font-semibold text-slate-800 hover:text-[#0b3b8c] tabular-nums"
                >
                  {(amt / 1000).toLocaleString('id-ID')}rb
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="pos-ket" className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan
            </label>
            <input
              id="pos-ket"
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="submit"
              disabled={submitting || Boolean(validationError)}
              className={`flex-1 min-h-[44px] px-4 py-2 text-white font-bold text-sm rounded-lg transition-colors disabled:opacity-50 cursor-pointer ${
                jenis === 'Top Up'
                  ? 'bg-[#0a3b8c] hover:bg-[#07265c]'
                  : jenis === 'Tarik Tunai'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting ? 'Memproses...' : `Konfirmasi ${jenis}`}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[44px] px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </form>

        {/* Riwayat Terakhir */}
        <div className="lg:col-span-5 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Riwayat Transaksi Terakhir</h3>
            <span className="text-xs text-slate-500">10 terbaru</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11.5px] font-bold text-slate-600">
                  <th className="py-2.5 px-3">Santri</th>
                  <th className="py-2.5 px-3">Jenis</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transaksiList.slice(0, 10).map((t) => (
                  <tr
                    key={t.id_transaksi}
                    onClick={() => onShowReceipt(t)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">{t.nama_santri}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {t.tanggal_waktu.slice(11, 19) || t.tanggal_waktu}
                      </div>
                    </td>
                    <td
                      className={`py-2 px-3 font-bold whitespace-nowrap ${
                        t.jenis_transaksi === 'Top Up'
                          ? 'text-emerald-700'
                          : t.jenis_transaksi === 'Belanja'
                            ? 'text-red-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {t.jenis_transaksi}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatRupiah(t.nominal)}
                    </td>
                  </tr>
                ))}
                {transaksiList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      Belum ada transaksi tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
