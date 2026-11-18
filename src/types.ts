export type UserRole = 'admin' | 'kasir';
export type AccountStatus = 'aktif' | 'nonaktif';
export type JenisTransaksi = 'Top Up' | 'Belanja' | 'Tarik Tunai';

export type NavView =
  | 'home'
  | 'kasir'
  | 'topup'
  | 'tarik'
  | 'mutasi'
  | 'santri'
  | 'users'
  | 'laporan'
  | 'logs'
  | 'institution'
  | 'settings';

export interface InstitutionSettings {
  nama_lembaga: string;
  subjudul_aplikasi: string;
  alamat: string;
  kota: string;
  telepon: string;
  email_website: string;
  nama_unit: string;
  footer_struk: string;
  logo_url: string;
}

export interface UserAccount {
  id: string;
  uid?: string;
  email?: string;
  username: string;
  password?: string;
  nama_petugas: string;
  role: UserRole;
  status: AccountStatus;
}

export interface Santri {
  nis: string;
  rfid_uid: string;
  nama_santri: string;
  kelas: string;
  saldo: number;
  limit_harian: number;
  status: AccountStatus;
  terpakai_hari_ini?: number;
}

export interface Transaksi {
  id_transaksi: string;
  tanggal_waktu: string;
  nis: string;
  nama_santri: string;
  jenis_transaksi: JenisTransaksi;
  nominal: number;
  saldo_akhir: number;
  petugas: string;
  keterangan: string;
}

export interface LogEntry {
  id_log: string;
  waktu: string;
  pengguna: string;
  aksi: string;
  detail: string;
}

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}
