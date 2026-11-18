import React, { useMemo, useState } from 'react';
import { Download, Plus, Search, SlidersHorizontal, Trash2, Edit2, X } from 'lucide-react';
import { callCashlessApi, formatRupiah, getTodayPrefix } from '../services/cashlessApi';
import { AccountStatus, LogEntry, Santri, Transaksi, UserAccount, UserRole } from '../types';
import { TransactionTrendChart } from './TransactionTrendChart';

/* ==================== 1. CEK SALDO & MUTASI ==================== */
export const MutasiView: React.FC<{
  santriList: Santri[];
  transaksiList: Transaksi[];
  onBackHome: () => void;
}> = ({ santriList, transaksiList, onBackHome }) => {
  const [query, setQuery] = useState('');
  const [detailNis, setDetailNis] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return santriList.filter(
      (s) =>
        !q ||
        s.nis.toLowerCase().includes(q) ||
        s.nama_santri.toLowerCase().includes(q) ||
        s.rfid_uid.toLowerCase().includes(q)
    );
  }, [santriList, query]);

  const detailTrx = useMemo(
    () => (detailNis ? transaksiList.filter((t) => t.nis === detailNis) : []),
    [detailNis, transaksiList]
  );

  return (
    <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">0324. Cek Saldo &amp; Mutasi Santri</h2>
          <p className="text-xs text-slate-500">Cari saldo dan riwayat mutasi berdasarkan RFID, NIS, atau Nama.</p>
        </div>
        <button
          type="button"
          onClick={onBackHome}
          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700"
        >
          Kembali ke Beranda
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik NIS, RFID UID, atau Nama Santri..."
            className="w-full min-h-[42px] pl-9 pr-3 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                <th className="py-2.5 px-3">NIS</th>
                <th className="py-2.5 px-3">RFID UID</th>
                <th className="py-2.5 px-3">Nama Santri</th>
                <th className="py-2.5 px-3">Kelas</th>
                <th className="py-2.5 px-3 text-right">Saldo</th>
                <th className="py-2.5 px-3 text-right">Limit Harian</th>
                <th className="py-2.5 px-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((s) => (
                <tr key={s.nis} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono">{s.nis}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{s.rfid_uid || '-'}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{s.nama_santri}</td>
                  <td className="py-2.5 px-3">{s.kelas}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(s.saldo)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {formatRupiah(s.limit_harian)}
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => setDetailNis(s.nis)}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md font-semibold text-slate-700"
                    >
                      Lihat Mutasi
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Data santri tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailNis && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-300 w-full max-w-2xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <strong className="text-sm">Riwayat Mutasi NIS {detailNis}</strong>
              <button type="button" onClick={() => setDetailNis(null)} className="p-1 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                      <th className="py-2 px-3">Waktu</th>
                      <th className="py-2 px-3">Jenis</th>
                      <th className="py-2 px-3 text-right">Nominal</th>
                      <th className="py-2 px-3 text-right">Saldo Akhir</th>
                      <th className="py-2 px-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailTrx.map((t) => (
                      <tr key={t.id_transaksi}>
                        <td className="py-2 px-3 font-mono">{t.tanggal_waktu}</td>
                        <td className="py-2 px-3 font-semibold">{t.jenis_transaksi}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatRupiah(t.nominal)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{formatRupiah(t.saldo_akhir)}</td>
                        <td className="py-2 px-3 text-slate-600">{t.keterangan}</td>
                      </tr>
                    ))}
                    {detailTrx.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          Belum ada riwayat mutasi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== 2. SETUP SANTRI & KARTU RFID ==================== */
export const SantriCrudView: React.FC<{
  user: UserAccount;
  santriList: Santri[];
  onUpdateList: (list: Santri[]) => void;
  onBackHome: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}> = ({ user, santriList, onUpdateList, onBackHome, onNotify }) => {
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Santri | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [limitTarget, setLimitTarget] = useState<Santri | null>(null);
  const [dynamicLimitValue, setDynamicLimitValue] = useState<number>(0);
  const [savingLimit, setSavingLimit] = useState(false);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return santriList.filter(
      (s) =>
        !q ||
        s.nis.toLowerCase().includes(q) ||
        s.nama_santri.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q) ||
        s.rfid_uid.toLowerCase().includes(q)
    );
  }, [santriList, filter]);

  const mergeUsageCounts = (updated: Santri[]) =>
    updated.map((item) => {
      if (item.terpakai_hari_ini !== undefined) return item;
      const prev = santriList.find((p) => p.nis === item.nis);
      return { ...item, terpakai_hari_ini: prev?.terpakai_hari_ini || 0 };
    });

  const openCreate = () => {
    setIsNew(true);
    setEditing({
      nis: '',
      rfid_uid: '',
      nama_santri: '',
      kelas: '',
      saldo: 0,
      limit_harian: 25000,
      status: 'aktif',
    });
  };

  const openDynamicLimit = (s: Santri) => {
    setLimitTarget(s);
    setDynamicLimitValue(Number(s.limit_harian || 0));
  };

  const handleSaveDynamicLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limitTarget) return;
    setSavingLimit(true);
    try {
      const nextLimit = Math.max(0, Number(dynamicLimitValue || 0));
      const updatedSantri: Santri = {
        nis: limitTarget.nis,
        rfid_uid: limitTarget.rfid_uid,
        nama_santri: limitTarget.nama_santri,
        kelas: limitTarget.kelas,
        saldo: Number(limitTarget.saldo || 0),
        limit_harian: nextLimit,
        status: limitTarget.status,
      };
      const res = await callCashlessApi<{ santri: Santri[] }>('saveSantri', {
        mode: 'update',
        santri: updatedSantri,
        petugas: user.nama_petugas,
      });
      onUpdateList(mergeUsageCounts(res.santri));
      onNotify(
        `Limit harian ${limitTarget.nama_santri} diubah menjadi ${
          nextLimit > 0 ? formatRupiah(nextLimit) : 'Tanpa Limit'
        }.`
      );
      setLimitTarget(null);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal memperbarui limit harian.', 'error');
    } finally {
      setSavingLimit(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const res = await callCashlessApi<{ santri: Santri[] }>('saveSantri', {
        mode: isNew ? 'create' : 'update',
        santri: editing,
        petugas: user.nama_petugas,
      });
      onUpdateList(mergeUsageCounts(res.santri));
      setEditing(null);
      onNotify(isNew ? 'Santri baru berhasil ditambahkan.' : 'Data santri diperbarui.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menyimpan data santri.', 'error');
    }
  };

  const handleDelete = async (nis: string) => {
    try {
      const res = await callCashlessApi<{ santri: Santri[] }>('deleteSantri', {
        nis,
        petugas: user.nama_petugas,
      });
      onUpdateList(mergeUsageCounts(res.santri));
      onNotify(`Data santri NIS ${nis} dihapus.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menghapus data.', 'error');
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">0202. Setup Santri &amp; Kartu RFID</h2>
          <p className="text-xs text-slate-500">
            Kelola data master santri, RFID UID, set limit belanja harian dinamis, dan status kartu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Santri
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700"
          >
            Kembali
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Cari NIS, Nama, Kelas, atau RFID..."
            className="w-full min-h-[40px] pl-9 pr-3 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                <th className="py-2.5 px-3">NIS</th>
                <th className="py-2.5 px-3">RFID UID</th>
                <th className="py-2.5 px-3">Nama Santri</th>
                <th className="py-2.5 px-3">Kelas</th>
                <th className="py-2.5 px-3 text-right">Saldo</th>
                <th className="py-2.5 px-3 text-right">Limit Harian</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((s) => (
                <tr key={s.nis} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono">{s.nis}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{s.rfid_uid || '-'}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{s.nama_santri}</td>
                  <td className="py-2.5 px-3">{s.kelas}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">{formatRupiah(s.saldo)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <div className="font-semibold text-slate-900">
                      {Number(s.limit_harian || 0) > 0 ? formatRupiah(s.limit_harian) : 'Tanpa Limit'}
                    </div>
                    {Number(s.terpakai_hari_ini || 0) > 0 && (
                      <div className="text-[11px] text-slate-500">
                        Terpakai: {formatRupiah(s.terpakai_hari_ini || 0)}
                      </div>
                    )}
                  </td>
                  <td className={`py-2.5 px-3 font-bold ${s.status === 'aktif' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {s.status.toUpperCase()}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap space-x-1.5">
                    <button
                      type="button"
                      onClick={() => openDynamicLimit(s)}
                      className="px-2.5 py-1 bg-[#0a3b8c] hover:bg-[#07265c] text-white rounded-md inline-flex items-center gap-1 font-semibold"
                    >
                      <SlidersHorizontal className="w-3 h-3" /> Set Limit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNew(false);
                        setEditing({ ...s });
                      }}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md inline-flex items-center gap-1 font-semibold"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.nis)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md inline-flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Belum ada data santri.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Set Limit Harian Dinamis */}
      {limitTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <strong className="text-sm text-slate-900">Set Limit Harian Dinamis</strong>
              <button
                type="button"
                onClick={() => setLimitTarget(null)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDynamicLimit} className="p-4 space-y-3.5">
              <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-bold text-[#0b3b8c]">{limitTarget.nama_santri}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  NIS <span className="font-mono">{limitTarget.nis}</span> · Kelas {limitTarget.kelas}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs">
                  <div>
                    <span className="block text-slate-500">Limit Saat Ini</span>
                    <strong className="font-mono text-slate-900">
                      {limitTarget.limit_harian > 0 ? formatRupiah(limitTarget.limit_harian) : 'Tanpa Limit'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-500">Terpakai Hari Ini</span>
                    <strong className="font-mono text-slate-900">
                      {formatRupiah(limitTarget.terpakai_hari_ini || 0)}
                    </strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nominal Limit Harian Baru (Rp)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDynamicLimitValue((v) => Math.max(0, v - 5000))}
                    className="min-h-[40px] px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold"
                  >
                    -5rb
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={dynamicLimitValue}
                    onChange={(e) => setDynamicLimitValue(Math.max(0, Number(e.target.value || 0)))}
                    className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg font-mono text-sm font-bold text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setDynamicLimitValue((v) => Math.max(0, v + 5000))}
                    className="min-h-[40px] px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold"
                  >
                    +5rb
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Isi <strong>0</strong> untuk menonaktifkan batas belanja harian (Tanpa Limit).
                </p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Cepat Nominal Limit
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { val: 0, label: 'Tanpa Limit' },
                    { val: 10000, label: 'Rp 10.000' },
                    { val: 15000, label: 'Rp 15.000' },
                    { val: 20000, label: 'Rp 20.000' },
                    { val: 25000, label: 'Rp 25.000' },
                    { val: 30000, label: 'Rp 30.000' },
                    { val: 50000, label: 'Rp 50.000' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setDynamicLimitValue(preset.val)}
                      className={`min-h-[34px] px-2 rounded-md text-xs font-semibold border transition-colors ${
                        dynamicLimitValue === preset.val
                          ? 'bg-[#0a3b8c] text-white border-[#0a3b8c]'
                          : 'bg-slate-50 hover:bg-blue-50 text-slate-800 border-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                {dynamicLimitValue === 0 ? (
                  <span>
                    Status: <strong className="text-emerald-700">Tanpa Batas Belanja Harian</strong>
                  </span>
                ) : (
                  <span>
                    Sisa limit hari ini setelah diubah:{' '}
                    <strong className="font-mono text-slate-900">
                      {formatRupiah(
                        Math.max(0, dynamicLimitValue - Number(limitTarget.terpakai_hari_ini || 0))
                      )}
                    </strong>
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingLimit}
                  className="flex-1 min-h-[42px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm rounded-lg"
                >
                  {savingLimit ? 'Menyimpan...' : 'Simpan Limit Baru'}
                </button>
                <button
                  type="button"
                  onClick={() => setLimitTarget(null)}
                  className="min-h-[42px] px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <strong className="text-sm">{isNew ? 'Tambah Santri Baru' : 'Ubah Data Santri'}</strong>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NIS</label>
                <input
                  type="text"
                  value={editing.nis}
                  readOnly={!isNew}
                  required
                  onChange={(e) => setEditing({ ...editing, nis: e.target.value })}
                  className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg font-mono text-sm read-only:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RFID UID (Tap Kartu di Sini)
                </label>
                <input
                  type="text"
                  value={editing.rfid_uid}
                  onChange={(e) => setEditing({ ...editing, rfid_uid: e.target.value })}
                  placeholder="Opsional / scan kartu"
                  className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Santri</label>
                <input
                  type="text"
                  required
                  value={editing.nama_santri}
                  onChange={(e) => setEditing({ ...editing, nama_santri: e.target.value })}
                  className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas / Asrama</label>
                <input
                  type="text"
                  required
                  value={editing.kelas}
                  onChange={(e) => setEditing({ ...editing, kelas: e.target.value })}
                  className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Saldo (Rp)</label>
                  <input
                    type="number"
                    value={editing.saldo}
                    onChange={(e) => setEditing({ ...editing, saldo: Number(e.target.value || 0) })}
                    className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Limit Harian (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editing.limit_harian}
                    onChange={(e) =>
                      setEditing({ ...editing, limit_harian: Math.max(0, Number(e.target.value || 0)) })
                    }
                    className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[0, 15000, 20000, 25000, 30000, 50000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEditing({ ...editing, limit_harian: val })}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 border border-slate-300 rounded text-[11px] font-semibold text-slate-700"
                  >
                    {val === 0 ? 'Tanpa Limit' : `${val / 1000}rb`}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Kartu</label>
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as AccountStatus })}
                  className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif / Blokir</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full min-h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg"
              >
                Simpan Data Santri
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== 3. SETUP PENGGUNA ==================== */
export const UsersCrudView: React.FC<{
  currentUser: UserAccount;
  usersList: UserAccount[];
  onUpdateUsers: (list: UserAccount[]) => void;
  onBackHome: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}> = ({ currentUser, usersList, onUpdateUsers, onBackHome, onNotify }) => {
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openCreate = () => {
    setIsNew(true);
    setEditing({
      id: '',
      email: '',
      username: '',
      nama_petugas: '',
      role: 'kasir',
      status: 'aktif',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const res = await callCashlessApi<{ users: UserAccount[] }>('saveUser', {
        mode: isNew ? 'create' : 'update',
        user: editing,
        petugas: currentUser.nama_petugas,
      });
      onUpdateUsers(res.users);
      setEditing(null);
      onNotify(isNew ? 'Petugas baru ditambahkan.' : 'Data pengguna diperbarui.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menyimpan pengguna.', 'error');
    }
  };

  const handleDeleteUser = async (id: string, nama: string) => {
    try {
      const res = await callCashlessApi<{ users: UserAccount[] }>('deleteUser', { id });
      onUpdateUsers(res.users);
      onNotify(`Akun petugas ${nama} dihapus.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menghapus pengguna.', 'error');
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">0201. Setup Pengguna Sistem</h2>
          <p className="text-xs text-slate-500">
            Kelola hak akses Administrator &amp; Petugas Kasir (login menggunakan akun Google).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Petugas
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700"
          >
            Kembali
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Email Google</th>
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Nama Petugas</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono">{u.id}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{u.email || '-'}</td>
                  <td className="py-2.5 px-3 font-mono font-bold">{u.username}</td>
                  <td className="py-2.5 px-3 font-semibold">{u.nama_petugas}</td>
                  <td className="py-2.5 px-3 uppercase font-semibold">{u.role}</td>
                  <td className={`py-2.5 px-3 font-bold ${u.status === 'aktif' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {u.status.toUpperCase()}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNew(false);
                        setEditing({ ...u });
                      }}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md font-semibold"
                    >
                      Edit
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.nama_petugas)}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <strong className="text-sm">{isNew ? 'Daftarkan Petugas Baru' : 'Ubah Hak Akses Pengguna'}</strong>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Akun Google
                </label>
                <input
                  type="email"
                  required={isNew}
                  value={editing.email || ''}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  placeholder="contoh: kasir.kantin@gmail.com"
                  className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username Singkat</label>
                <input
                  type="text"
                  required
                  value={editing.username}
                  onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                  placeholder="contoh: kasir1"
                  className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Petugas</label>
                <input
                  type="text"
                  required
                  value={editing.nama_petugas}
                  onChange={(e) => setEditing({ ...editing, nama_petugas: e.target.value })}
                  placeholder="contoh: Petugas Kantin Putra"
                  className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={editing.role}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value as UserRole })}
                    className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="kasir">Kasir</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editing.status}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value as AccountStatus })}
                    className="w-full min-h-[40px] px-3 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full min-h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg"
              >
                Simpan Pengguna
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== 4. LAPORAN TRANSAKSI ==================== */
export const LaporanView: React.FC<{
  transaksiList: Transaksi[];
  onShowReceipt: (t: Transaksi) => void;
  onBackHome: () => void;
}> = ({ transaksiList, onShowReceipt, onBackHome }) => {
  const [jenis, setJenis] = useState('');
  const [search, setSearch] = useState('');

  const searchedOnly = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transaksiList.filter(
      (t) =>
        !q ||
        t.nama_santri.toLowerCase().includes(q) ||
        t.nis.toLowerCase().includes(q) ||
        t.petugas.toLowerCase().includes(q)
    );
  }, [transaksiList, search]);

  const filtered = useMemo(() => {
    return searchedOnly.filter((t) => !jenis || t.jenis_transaksi === jenis);
  }, [searchedOnly, jenis]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, t) => {
        if (t.jenis_transaksi === 'Top Up') acc.topUp += Number(t.nominal || 0);
        else if (t.jenis_transaksi === 'Belanja') acc.belanja += Number(t.nominal || 0);
        else if (t.jenis_transaksi === 'Tarik Tunai') acc.tarik += Number(t.nominal || 0);
        return acc;
      },
      { topUp: 0, belanja: 0, tarik: 0 }
    );
  }, [filtered]);

  const handleExportCsv = () => {
    const header = 'id_transaksi,tanggal_waktu,nis,nama_santri,jenis_transaksi,nominal,saldo_akhir,petugas,keterangan\n';
    const body = filtered
      .map((t) =>
        [
          t.id_transaksi,
          t.tanggal_waktu,
          t.nis,
          `"${t.nama_santri}"`,
          t.jenis_transaksi,
          t.nominal,
          t.saldo_akhir,
          `"${t.petugas}"`,
          `"${t.keterangan}"`,
        ].join(',')
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `laporan-cashless-lembaga-${getTodayPrefix()}.csv`;
    a.click();
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">0401. Laporan Transaksi Cashless</h2>
          <p className="text-xs text-slate-500">Rekapitulasi transaksi Top Up, Belanja, dan Tarik Tunai.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#0a3b8c] hover:bg-[#07265c] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh CSV
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700"
          >
            Kembali
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
            className="min-h-[40px] px-3 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">Semua Jenis Transaksi</option>
            <option value="Top Up">Top Up</option>
            <option value="Belanja">Belanja</option>
            <option value="Tarik Tunai">Tarik Tunai</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter nama santri / NIS / petugas..."
            className="min-h-[40px] px-3 border border-slate-300 rounded-lg text-sm w-full max-w-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <span className="block text-xs font-semibold text-slate-500">Total Top Up</span>
            <strong className="font-mono text-base text-emerald-700">{formatRupiah(totals.topUp)}</strong>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <span className="block text-xs font-semibold text-slate-500">Total Belanja</span>
            <strong className="font-mono text-base text-red-700">{formatRupiah(totals.belanja)}</strong>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <span className="block text-xs font-semibold text-slate-500">Total Tarik Tunai</span>
            <strong className="font-mono text-base text-amber-700">{formatRupiah(totals.tarik)}</strong>
          </div>
        </div>

        <TransactionTrendChart transaksiList={searchedOnly} />

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                <th className="py-2.5 px-3">ID Transaksi</th>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Santri</th>
                <th className="py-2.5 px-3">Jenis</th>
                <th className="py-2.5 px-3 text-right">Nominal</th>
                <th className="py-2.5 px-3 text-right">Saldo Akhir</th>
                <th className="py-2.5 px-3">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((t) => (
                <tr
                  key={t.id_transaksi}
                  onClick={() => onShowReceipt(t)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-2 px-3 font-mono text-[11.5px]">{t.id_transaksi}</td>
                  <td className="py-2 px-3 font-mono text-[11.5px]">{t.tanggal_waktu}</td>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-slate-900">{t.nama_santri}</div>
                    <div className="font-mono text-[11px] text-slate-500">{t.nis}</div>
                  </td>
                  <td className="py-2 px-3 font-semibold">{t.jenis_transaksi}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold">{formatRupiah(t.nominal)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(t.saldo_akhir)}</td>
                  <td className="py-2 px-3">{t.petugas}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada data transaksi yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ==================== 5. LOG SISTEM ==================== */
export const LogsView: React.FC<{
  logs: LogEntry[];
  onBackHome: () => void;
}> = ({ logs, onBackHome }) => {
  return (
    <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">0211. Log Aktivitas Sistem</h2>
          <p className="text-xs text-slate-500">Catatan audit login, transaksi, dan perubahan data master.</p>
        </div>
        <button
          type="button"
          onClick={onBackHome}
          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700"
        >
          Kembali
        </button>
      </div>
      <div className="p-5">
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Pengguna</th>
                <th className="py-2.5 px-3">Aksi</th>
                <th className="py-2.5 px-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id_log} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono whitespace-nowrap">{l.waktu}</td>
                  <td className="py-2 px-3 font-semibold">{l.pengguna}</td>
                  <td className="py-2 px-3 font-mono text-[#0b3b8c]">{l.aksi}</td>
                  <td className="py-2 px-3 text-slate-700">{l.detail}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Belum ada log sistem.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
