import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import {
  callCashlessApi,
  compressLogoFile,
  DEFAULT_INSTITUTION_SETTINGS,
  saveStoredSettings,
} from '../services/cashlessApi';
import { InstitutionSettings, UserAccount } from '../types';
import { InstitutionLogo } from './AlAzharLogo';

interface InstitutionSettingsViewProps {
  user: UserAccount;
  settings: InstitutionSettings;
  onUpdateSettings: (next: InstitutionSettings) => void;
  onBackHome: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const InstitutionSettingsView: React.FC<InstitutionSettingsViewProps> = ({
  user,
  settings,
  onUpdateSettings,
  onBackHome,
  onNotify,
}) => {
  const [form, setForm] = useState<InstitutionSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressLogoFile(file);
      setForm((prev) => ({ ...prev, logo_url: dataUrl }));
      onNotify('Logo berhasil dimuat. Klik "Simpan Pengaturan" untuk menyimpan permanen.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal memproses file logo.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_lembaga.trim()) {
      onNotify('Nama lembaga wajib diisi.', 'error');
      return;
    }
    setSaving(true);
    try {
      const cleaned: InstitutionSettings = {
        ...form,
        nama_lembaga: form.nama_lembaga.trim(),
        subjudul_aplikasi: form.subjudul_aplikasi.trim() || DEFAULT_INSTITUTION_SETTINGS.subjudul_aplikasi,
        alamat: form.alamat.trim(),
        kota: form.kota.trim(),
        telepon: form.telepon.trim(),
        email_website: form.email_website.trim(),
        nama_unit: form.nama_unit.trim(),
        footer_struk: form.footer_struk.trim() || DEFAULT_INSTITUTION_SETTINGS.footer_struk,
        logo_url: form.logo_url.trim(),
      };
      const res = await callCashlessApi<{ settings: InstitutionSettings }>(
        'saveSettings',
        {
          settings: cleaned,
          petugas: user.nama_petugas,
        }
      );
      const saved = saveStoredSettings(res.settings || cleaned);
      onUpdateSettings(saved);
      onNotify('Pengaturan identitas & logo lembaga berhasil disimpan.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan lembaga.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            0204. Pengaturan Identitas &amp; Logo Lembaga
          </h2>
          <p className="text-xs text-slate-500">
            Unggah logo lembaga sendiri serta ubah nama, alamat, kontak, dan keterangan struk.
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

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* Bagian Upload Logo */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <InstitutionLogo
              size={88}
              logoUrl={form.logo_url}
              institutionName={form.nama_lembaga}
              className="mx-auto sm:mx-0"
            />
            <div className="flex-1 space-y-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Logo Lembaga</h3>
                <p className="text-xs text-slate-600">
                  Unggah file gambar logo resmi lembaga (PNG transparan, JPG, WebP, atau SVG). Gambar otomatis dikompres agar tetap ringan saat dimuat.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                  id="institution-logo-upload"
                />
                <label
                  htmlFor="institution-logo-upload"
                  className="min-h-[38px] px-3.5 py-2 bg-[#0a3b8c] hover:bg-[#07265c] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Memproses...' : 'Upload Logo dari Perangkat'}
                </label>
                {form.logo_url && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, logo_url: '' }))}
                    className="min-h-[38px] px-3 py-2 bg-white border border-red-300 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Logo
                  </button>
                )}
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                  Atau masukkan URL Gambar Logo (Opsional)
                </label>
                <input
                  type="text"
                  value={form.logo_url.startsWith('data:') ? '' : form.logo_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))}
                  placeholder={
                    form.logo_url.startsWith('data:')
                      ? 'Logo terpasang dari file upload lokal (isi URL baru jika ingin mengganti)'
                      : 'https://contoh.com/logo-lembaga.png'
                  }
                  className="w-full min-h-[38px] px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Data Lembaga */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lembaga / Pondok / Sekolah *
            </label>
            <input
              type="text"
              required
              value={form.nama_lembaga}
              onChange={(e) => setForm({ ...form, nama_lembaga: e.target.value })}
              placeholder="Contoh: PP. Al-Falah Muncar"
              className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subjudul / Nama Aplikasi
            </label>
            <input
              type="text"
              value={form.subjudul_aplikasi}
              onChange={(e) => setForm({ ...form, subjudul_aplikasi: e.target.value })}
              placeholder="Contoh: Aplikasi Sistem Informasi Cashless"
              className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lokasi Singkat / Kota / Kecamatan
            </label>
            <input
              type="text"
              value={form.kota}
              onChange={(e) => setForm({ ...form, kota: e.target.value })}
              placeholder="Contoh: Kedungrengin, Muncar, Banyuwangi"
              className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Unit Kasir / Koperasi (untuk Struk)
            </label>
            <input
              type="text"
              value={form.nama_unit}
              onChange={(e) => setForm({ ...form, nama_unit: e.target.value })}
              placeholder="Contoh: Koperasi & Kantin Santri"
              className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Lengkap Lembaga
            </label>
            <input
              type="text"
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              placeholder="Contoh: Jl. KH. Ahmad Dahlan No. 10, Kedungrengin, Muncar, Banyuwangi"
              className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              No. Telepon / WhatsApp Lembaga
            </label>
            <input
              type="text"
              value={form.telepon}
              onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              placeholder="Contoh: 0812-3456-7890"
              className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Website / Email Lembaga
            </label>
            <input
              type="text"
              value={form.email_website}
              onChange={(e) => setForm({ ...form, email_website: e.target.value })}
              placeholder="Contoh: alfalahmuncar.my.id"
              className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Kaki Struk Thermal
            </label>
            <input
              type="text"
              value={form.footer_struk}
              onChange={(e) => setForm({ ...form, footer_struk: e.target.value })}
              placeholder="Terima kasih · Simpan sebagai bukti transaksi sah"
              className="w-full min-h-[42px] px-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setForm({ ...DEFAULT_INSTITUTION_SETTINGS, logo_url: '' })}
            className="min-h-[42px] px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Standar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="min-h-[42px] px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Lembaga'}
          </button>
        </div>
      </form>
    </div>
  );
};
