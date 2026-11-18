# Panduan Penyiapan Database Google Sheets & Deployment ke Blogger

Sistem Informasi Cashless Lembaga dirancang agar mudah di-hosting secara gratis menggunakan **Google Sheets + Google Apps Script** sebagai backend, dan **Blogger (Postingan atau Halaman)** sebagai frontend layar penuh yang menutup tema Blogger secara utuh tanpa bentrok CSS template.

---

## Langkah 1: Siapkan Google Spreadsheet
1. Buka [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru, beri nama misalnya: **`DB Cashless Lembaga`**.
2. Anda tidak perlu membuat nama sheet atau header kolom secara manual — skrip `Code.gs` akan otomatis membuatkan 5 sheet beserta header-nya (`users`, `santri`, `transaksi`, `log_sistem`, `pengaturan`) saat inisialisasi dijalankan.

---

## Langkah 2: Pasang Skrip Backend (`Code.gs`)
1. Di Google Sheets tersebut, klik menu **Ekstensi (Extensions) → Apps Script**.
2. Hapus seluruh kode bawaan (`function myFunction() {}`) di editor `Code.gs`.
3. Salin seluruh isi file **`Code.gs`** dan tempelkan ke editor Apps Script.
4. Klik ikon **Simpan (Ctrl+S)** dan beri nama project: `Cashless Lembaga API`.
5. **Inisialisasi Data Awal:**
   - Di dropdown fungsi bagian atas editor (sebelah tombol *Run/Jalankan*), pilih **`setupDatabase`**, lalu klik **Run (Jalankan)**.
   - Jika muncul dialog *Authorization Required*, klik **Review permissions → Pilih akun Google Anda → Lanjutan (Advanced) → Buka Cashless Lembaga API (unsafe) → Allow**.
   - Cek kembali Google Sheets Anda: sheet `users`, `santri`, `transaksi`, `log_sistem`, dan `pengaturan` beserta akun default (`admin` / `admin123` dan `kasir` / `kasir123`) sudah otomatis terisi.

---

## Langkah 3: Deploy sebagai Web App
1. Di editor Apps Script, klik tombol **Deploy (Terapkan) → New deployment (Deployment baru)**.
2. Klik ikon roda gigi pada *Select type* → pilih **Web app**.
3. Isi konfigurasi berikut dengan tepat:
   - **Description**: `API Cashless v1.3.0`
   - **Execute as (Jalankan sebagai)**: **`Me` (Saya)**
   - **Who has access (Yang memiliki akses)**: **`Anyone` (Siapa saja)** *(wajib "Siapa saja" agar aplikasi di Blogger dapat mengakses API tanpa error login Google/CORS)*.
4. Klik **Deploy**.
5. Salin **Web App URL** yang muncul (berakhiran `/exec`, contoh: `https://script.google.com/macros/s/AKfycbx.../exec`).

> **Catatan Pembaruan Kode (PENTING):** Jika Anda memperbarui kode `Code.gs` ke versi terbaru (misalnya v1.3.0 dengan sheet `pengaturan` untuk logo & identitas lembaga), wajib klik **Deploy → Manage deployments → Edit (ikon pensil) → Version: New version → Deploy** agar endpoint baru langsung aktif di URL yang sama.

---

## Langkah 4: Pasang ke Postingan / Halaman Blogger
1. Buka Dashboard **Blogger** → buat **Halaman (Pages)** baru atau **Postingan** baru.
2. Pada editor Blogger, ubah mode penulisan dari *Compose View (Tampilan Menulis)* ke **HTML View (Tampilan HTML)** melalui ikon pensil/kode di pojok kiri atas toolbar.
3. Buka file **`blogger-standalone.html`** (atau salin langsung dari menu **Setup → Integrasi GAS & Blogger** di aplikasi).
4. **Opsional (Disarankan):** Cari baris `const DEFAULT_GAS_URL = "";` di bagian `<script>` dan isi dengan Web App URL Anda, contoh:
   ```js
   const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbx.../exec";
   ```
   *(Jika dikosongkan, petugas juga tetap bisa mengisi Web App URL melalui tombol **Konfigurasi API Sheets** di halaman Login).*
5. Klik **Publish (Publikasikan)**. Saat dibuka, aplikasi akan otomatis tampil **full-screen menutup header, sidebar, dan widget tema Blogger** sehingga nyaman dipakai layaknya aplikasi kasir desktop/mobile mandiri.

---

## Langkah 5: Pengujian Awal & Pengaturan Identitas Lembaga
1. Buka halaman Blogger yang sudah dipublikasikan.
2. Pada halaman **LOGIN SISTEM**, pilih jenis akses:
   - **Admin**: Username `admin`, Password `admin123` *(akses penuh Setup Pengguna, Santri/RFID, Pengaturan Lembaga & Logo, Kasir, Top Up, Tarik Tunai, Laporan, Log)*.
   - **Kasir**: Username `kasir`, Password `kasir123` *(fokus Transaksi Belanja, Top Up, Tarik Tunai, Mutasi, Laporan)*.
3. Masuk ke menu **Setup → 0204. Pengaturan Lembaga & Logo** untuk:
   - Mengunggah **logo lembaga** Anda sendiri (otomatis dikompresi agar tersimpan aman di Google Sheets, atau gunakan URL gambar logo).
   - Mengubah **Nama Lembaga**, **Subjudul**, **Unit Kasir**, **Alamat Lengkap**, **Kota**, **Nomor Telepon**, **Website/Email**, dan **Footer Struk**.
4. Segera ubah password default melalui menu **Setup → 0201. Setup Pengguna** setelah sistem aktif digunakan.
