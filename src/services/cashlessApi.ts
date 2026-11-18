import { auth } from '../lib/firebase';
import { InstitutionSettings } from '../types';

export const STORAGE_KEYS = {
  SETTINGS: 'cashless_institution_settings',
};

export const DEFAULT_INSTITUTION_SETTINGS: InstitutionSettings = {
  nama_lembaga: 'PPM Al-Azhar Muncar',
  subjudul_aplikasi: 'Aplikasi Sistem Informasi Cashless',
  alamat: 'Banyuwangi, Jawa Timur',
  kota: 'Banyuwangi Jawa Timur',
  telepon: '',
  email_website: '',
  nama_unit: 'Koperasi & Kantin Santri',
  footer_struk: 'Terima kasih · Simpan sebagai bukti transaksi sah',
  logo_url: '',
};

let inMemoryIdToken: string | null = null;

export function setInMemoryAuthToken(token: string | null) {
  inMemoryIdToken = token;
}

export async function getFreshAuthToken(): Promise<string> {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    inMemoryIdToken = token;
    return token;
  }
  if (inMemoryIdToken) {
    return inMemoryIdToken;
  }
  throw new Error('Sesi login belum aktif. Silakan masuk terlebih dahulu.');
}

export function loadStoredSettings(): InstitutionSettings {
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<InstitutionSettings>;
      return { ...DEFAULT_INSTITUTION_SETTINGS, ...parsed };
    } catch {
      // ignore invalid JSON
    }
  }
  return { ...DEFAULT_INSTITUTION_SETTINGS };
}

export function saveStoredSettings(settings: InstitutionSettings): InstitutionSettings {
  const merged = { ...DEFAULT_INSTITUTION_SETTINGS, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
  return merged;
}

export async function compressLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar (PNG, JPG, WebP, atau SVG).');
  }
  if (file.type === 'image/svg+xml') {
    const text = await file.text();
    if (text.length < 36000) {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
    }
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      el.src = objectUrl;
    });
    const maxDim = 240;
    const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
    const width = Math.max(1, Math.round((img.width || maxDim) * scale));
    const height = Math.max(1, Math.round((img.height || maxDim) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');
    ctx.drawImage(img, 0, 0, width, height);

    let dataUrl = canvas.toDataURL('image/png');
    if (dataUrl.length > 75000) {
      dataUrl = canvas.toDataURL('image/webp', 0.86);
    }
    if (dataUrl.length > 75000) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    }
    if (dataUrl.length > 90000) {
      throw new Error('Ukuran gambar terlalu kompleks untuk disimpan. Gunakan logo yang lebih sederhana.');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function formatRupiah(num: number): string {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

export function formatDateTime(d: Date): string {
  const p = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function getTodayPrefix(offsetMs = 0): string {
  const d = new Date(Date.now() + offsetMs);
  const p = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function requestApi<T>(
  url: string,
  options: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {}
): Promise<T & { ok: boolean; serverTime?: string }> {
  const token = await getFreshAuthToken();
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = (await res.json().catch(() => ({}))) as T & {
    ok?: boolean;
    error?: string;
    serverTime?: string;
  };

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Permintaan gagal (HTTP ${res.status}).`);
  }
  return data as T & { ok: boolean; serverTime?: string };
}

export async function callCashlessApi<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T & { ok: boolean; serverTime?: string }> {
  switch (action) {
    case 'getBootstrap':
      return requestApi<T>('/api/bootstrap', { method: 'GET' });

    case 'createTransaksi':
      return requestApi<T>('/api/transaksi', { method: 'POST', body: payload });

    case 'saveSantri':
      return requestApi<T>('/api/santri', { method: 'POST', body: payload });

    case 'deleteSantri':
      return requestApi<T>(
        `/api/santri/${encodeURIComponent(String(payload.nis || ''))}`,
        { method: 'DELETE' }
      );

    case 'saveUser':
      return requestApi<T>('/api/users', { method: 'POST', body: payload });

    case 'deleteUser':
      return requestApi<T>(
        `/api/users/${encodeURIComponent(String(payload.id || ''))}`,
        { method: 'DELETE' }
      );

    case 'saveSettings':
      return requestApi<T>('/api/settings', { method: 'POST', body: payload });

    default:
      throw new Error(`Aksi API tidak dikenal: ${action}`);
  }
}
