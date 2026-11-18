import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  ChevronDown,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  RefreshCw,
  X,
} from 'lucide-react';
import { InstitutionLogo } from './components/AlAzharLogo';
import {
  LaporanView,
  LogsView,
  MutasiView,
  SantriCrudView,
  UsersCrudView,
} from './components/AdminModules';
import { ExportCodePanel } from './components/ExportCodePanel';
import { InstitutionSettingsView } from './components/InstitutionSettingsView';
import { LoginScreen } from './components/LoginScreen';
import { ReceiptModal } from './components/ReceiptModal';
import { TransaksiWorkspace } from './components/TransaksiWorkspace';
import { auth } from './lib/firebase';
import {
  callCashlessApi,
  formatRupiah,
  getTodayPrefix,
  loadStoredSettings,
  saveStoredSettings,
  setInMemoryAuthToken,
} from './services/cashlessApi';
import {
  InstitutionSettings,
  LogEntry,
  NavView,
  Santri,
  ToastMessage,
  Transaksi,
  UserAccount,
} from './types';

export default function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<UserAccount | null>(null);

  const [activeView, setActiveView] = useState<NavView>('home');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<InstitutionSettings>(() => loadStoredSettings());
  const [receipt, setReceipt] = useState<Transaksi | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
  });

  const handleUpdateSettings = useCallback((next: InstitutionSettings) => {
    const saved = saveStoredSettings(next);
    setSettings(saved);
  }, []);

  const notify = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const syncServerOffset = useCallback((serverIso: string) => {
    const ms = new Date(serverIso).getTime() - Date.now();
    if (!Number.isNaN(ms)) setServerOffsetMs(ms);
  }, []);

  const loadBootstrap = useCallback(async () => {
    const res = await callCashlessApi<{
      currentUser: UserAccount;
      santri: Santri[];
      transaksi: Transaksi[];
      users?: UserAccount[];
      logs?: LogEntry[];
      settings?: InstitutionSettings;
    }>('getBootstrap');
    if (res.serverTime) syncServerOffset(res.serverTime);
    setUser(res.currentUser);
    setSantriList(res.santri || []);
    setTransaksiList(res.transaksi || []);
    if (res.users) setUsersList(res.users);
    if (res.logs) setLogs(res.logs);
    if (res.settings) handleUpdateSettings(res.settings);
    return res.currentUser;
  }, [syncServerOffset, handleUpdateSettings]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setInMemoryAuthToken(null);
        setUser(null);
        setAuthChecking(false);
        return;
      }
      try {
        const token = await firebaseUser.getIdToken();
        setInMemoryAuthToken(token);
        await loadBootstrap();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : 'Gagal memuat profil petugas.',
          'error'
        );
        setUser(null);
      } finally {
        setAuthChecking(false);
      }
    });
    return () => unsub();
  }, [loadBootstrap, notify]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleDocClick = () => setOpenMenu(null);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  useEffect(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };
    const syncFs = () => {
      setIsFullscreen(
        Boolean(
          document.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement ||
            doc.msFullscreenElement
        )
      );
    };
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
    document.addEventListener('mozfullscreenchange', syncFs);
    document.addEventListener('MSFullscreenChange', syncFs);
    return () => {
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('webkitfullscreenchange', syncFs);
      document.removeEventListener('mozfullscreenchange', syncFs);
      document.removeEventListener('MSFullscreenChange', syncFs);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      msFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
      mozCancelFullScreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      mozRequestFullScreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };
    const activeEl =
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    try {
      if (activeEl) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      } else {
        if (root.requestFullscreen) await root.requestFullscreen();
        else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
        else if (root.mozRequestFullScreen) await root.mozRequestFullScreen();
        else if (root.msRequestFullscreen) await root.msRequestFullscreen();
        else {
          notify('Browser ini tidak mendukung Fullscreen API.', 'error');
        }
      }
    } catch {
      notify(
        'Mode layar penuh tidak diizinkan oleh browser atau kebijakan iframe saat ini.',
        'error'
      );
    }
  }, [notify]);

  const handleAuthSuccess = async (firebaseUser: User) => {
    const token = await firebaseUser.getIdToken();
    setInMemoryAuthToken(token);
    const loggedUser = await loadBootstrap();
    setActiveView('home');
    notify(`Selamat datang, ${loggedUser.nama_petugas}.`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setInMemoryAuthToken(null);
    setUser(null);
    setOpenMenu(null);
    setMobileDrawerOpen(false);
  };

  const navigateTo = (view: NavView) => {
    setActiveView(view);
    setOpenMenu(null);
    setMobileDrawerOpen(false);
  };

  const handleTransactionCreated = (trx: Transaksi, updatedSantri: Santri) => {
    setTransaksiList((prev) => [trx, ...prev]);
    setSantriList((prev) =>
      prev.map((s) => (s.nis === updatedSantri.nis ? updatedSantri : s))
    );
  };

  const liveClockStr =
    now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ' · ' +
    now.toLocaleTimeString('id-ID', { hour12: false });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-xs font-semibold text-white pointer-events-auto border-l-4 ${
              t.type === 'error'
                ? 'bg-red-900 border-red-400'
                : 'bg-slate-900 border-emerald-400'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {authChecking ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#eef4f0] to-[#d9eadf] p-4">
          <div className="bg-white border border-slate-300 rounded-xl px-6 py-5 shadow-md text-center space-y-2">
            <div className="text-sm font-bold text-[#0b3b8c]">Memuat Sistem Cashless...</div>
            <div className="text-xs text-slate-500">Memeriksa sesi petugas aktif.</div>
          </div>
        </div>
      ) : !user ? (
        <LoginScreen
          settings={settings}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onAuthSuccess={handleAuthSuccess}
          onNotify={notify}
        />
      ) : (
        <div className="min-h-screen flex flex-col max-w-[1440px] mx-auto bg-white shadow-lg border-x border-slate-200">
          {/* Top Administration Menu Bar */}
          <nav className="bg-indigo-50/90 border-b border-slate-300 px-3 min-h-[46px] flex items-center justify-between gap-4 relative z-30">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800"
              >
                <Menu className="w-4 h-4" />
                Menu
              </button>

              <div className="hidden md:flex items-center gap-1">
                {/* File Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(openMenu === 'file' ? null : 'file');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                      openMenu === 'file'
                        ? 'bg-blue-100 text-[#0b3b8c]'
                        : 'text-slate-800 hover:bg-blue-100/70'
                    }`}
                  >
                    File <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {openMenu === 'file' && (
                    <div className="absolute left-0 top-full mt-1 w-60 bg-white border border-slate-300 rounded-lg shadow-xl p-1.5 z-50">
                      <button
                        type="button"
                        onClick={() => navigateTo('home')}
                        className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c]"
                      >
                        0101. Beranda Utama
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setOpenMenu(null);
                          try {
                            await loadBootstrap();
                            notify('Data berhasil disegarkan.');
                          } catch (err) {
                            notify(
                              err instanceof Error ? err.message : 'Gagal memuat data.',
                              'error'
                            );
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c] flex items-center justify-between"
                      >
                        <span>0102. Segarkan Data</span>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-px bg-slate-200 my-1" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-red-700 rounded-md hover:bg-red-50"
                      >
                        0199. Logout / Keluar
                      </button>
                    </div>
                  )}
                </div>

                {/* Setup Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(openMenu === 'setup' ? null : 'setup');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                      openMenu === 'setup'
                        ? 'bg-blue-100 text-[#0b3b8c]'
                        : 'text-slate-800 hover:bg-blue-100/70'
                    }`}
                  >
                    Setup <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {openMenu === 'setup' && (
                    <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-xl p-1.5 z-50">
                      {user.role === 'admin' && (
                        <>
                          <button
                            type="button"
                            onClick={() => navigateTo('users')}
                            className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c]"
                          >
                            0201. Setup Pengguna
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateTo('santri')}
                            className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c]"
                          >
                            0202. Setup Santri / Kartu RFID
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateTo('institution')}
                            className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c]"
                          >
                            0204. Pengaturan Lembaga &amp; Logo
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => navigateTo('settings')}
                        className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c]"
                      >
                        0205. Ekspor HTML Blogger &amp; Panduan
                      </button>
                      {user.role === 'admin' && (
                        <>
                          <div className="h-px bg-slate-200 my-1" />
                          <button
                            type="button"
                            onClick={() => navigateTo('logs')}
                            className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c]"
                          >
                            0211. Log Sistem
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Operasional Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(openMenu === 'operasional' ? null : 'operasional');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                      openMenu === 'operasional'
                        ? 'bg-blue-100 text-[#0b3b8c]'
                        : 'text-slate-800 hover:bg-blue-100/70'
                    }`}
                  >
                    Operasional <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {openMenu === 'operasional' && (
                    <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-xl p-1.5 z-50">
                      <button
                        type="button"
                        onClick={() => navigateTo('kasir')}
                        className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c]"
                      >
                        0321. Transaksi Kasir / Belanja
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('topup')}
                        className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c]"
                      >
                        0322. Top Up Saldo Santri
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('tarik')}
                        className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c]"
                      >
                        0323. Tarik Tunai
                      </button>
                      <div className="h-px bg-slate-200 my-1" />
                      <button
                        type="button"
                        onClick={() => navigateTo('mutasi')}
                        className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-blue-50 hover:text-[#0b3b8c]"
                      >
                        0324. Cek Saldo &amp; Mutasi
                      </button>
                    </div>
                  )}
                </div>

                {/* Laporan */}
                <button
                  type="button"
                  onClick={() => navigateTo('laporan')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    activeView === 'laporan'
                      ? 'bg-blue-100 text-[#0b3b8c]'
                      : 'text-slate-800 hover:bg-blue-100/70'
                  }`}
                >
                  Laporan
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleFullscreen}
                aria-pressed={isFullscreen}
                title={
                  isFullscreen
                    ? 'Keluar dari mode layar penuh'
                    : 'Aktifkan layar penuh (tablet kasir)'
                }
                className={`px-2.5 sm:px-3 py-1.5 border rounded-md text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  isFullscreen
                    ? 'bg-blue-50 border-[#0b3b8c] text-[#0b3b8c] hover:bg-blue-100'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Keluar Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigateTo('kasir')}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-md text-xs font-semibold text-slate-800 whitespace-nowrap"
              >
                Kasir Cepat
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </nav>

          {/* Institutional Header Banner */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-white via-[#eff5ff] via-30% to-[#08337a] border-b-2 border-[#0a3b8c]">
            <div className="flex items-center gap-3 min-w-0">
              <InstitutionLogo
                size={52}
                logoUrl={settings.logo_url}
                institutionName={settings.nama_lembaga}
              />
              <div className="min-w-0">
                <div className="text-base font-extrabold text-[#0b3b8c] leading-tight truncate">
                  {settings.nama_lembaga}
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {settings.kota || settings.alamat}
                </div>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <div className="text-xs italic font-semibold text-amber-200 sm:text-yellow-300">
                {settings.nama_unit || 'Sistem Cashless Santri'}
              </div>
              <div className="text-xl font-extrabold text-white tracking-tight leading-tight">
                Administration App
              </div>
            </div>
          </header>

          {/* Main Workspace Area */}
          <main className="flex-1 p-4 sm:p-6 bg-gradient-to-b from-white via-[#f8fbf9] via-55% to-[#73b685]">
            {activeView === 'home' && (
              <div className="flex flex-col items-center justify-center text-center py-8 px-2">
                <InstitutionLogo
                  size={116}
                  logoUrl={settings.logo_url}
                  institutionName={settings.nama_lembaga}
                />
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b3b8c] mt-4">
                  {settings.nama_lembaga}
                </h1>
                <p className="text-base sm:text-lg font-bold text-slate-900">
                  {settings.alamat || settings.kota}
                </p>
                {(settings.telepon || settings.email_website) && (
                  <p className="text-xs text-slate-600 mt-1">
                    {[settings.telepon && `Telp: ${settings.telepon}`, settings.email_website]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                <p className="text-xs sm:text-sm text-slate-700 mt-2">
                  {santriList.length} Santri Terdaftar · Total Saldo Aktif{' '}
                  <strong className="font-mono">
                    {formatRupiah(santriList.reduce((sum, s) => sum + Number(s.saldo || 0), 0))}
                  </strong>{' '}
                  ·{' '}
                  {
                    transaksiList.filter((t) =>
                      t.tanggal_waktu.startsWith(getTodayPrefix(serverOffsetMs))
                    ).length
                  }{' '}
                  Transaksi Hari Ini
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full max-w-4xl mt-8">
                  <button
                    type="button"
                    onClick={() => navigateTo('kasir')}
                    className="bg-white/95 hover:bg-white border border-slate-300 hover:border-[#0b3b8c] rounded-xl p-4 text-left transition-all shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <span className="text-xs font-bold text-emerald-700">0321 · POS KASIR</span>
                    <strong className="block text-sm font-bold text-slate-900 mt-1.5">
                      Transaksi Belanja
                    </strong>
                    <span className="block text-xs text-slate-600 mt-1">
                      Scan RFID atau input NIS dengan validasi limit harian otomatis.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('topup')}
                    className="bg-white/95 hover:bg-white border border-slate-300 hover:border-[#0b3b8c] rounded-xl p-4 text-left transition-all shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#0b3b8c]">0322 · DEPOSIT</span>
                    <strong className="block text-sm font-bold text-slate-900 mt-1.5">
                      Top Up Saldo
                    </strong>
                    <span className="block text-xs text-slate-600 mt-1">
                      Penambahan saldo kartu santri secara langsung dan terverifikasi.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('tarik')}
                    className="bg-white/95 hover:bg-white border border-slate-300 hover:border-[#0b3b8c] rounded-xl p-4 text-left transition-all shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <span className="text-xs font-bold text-amber-700">0323 · PENARIKAN</span>
                    <strong className="block text-sm font-bold text-slate-900 mt-1.5">
                      Tarik Tunai
                    </strong>
                    <span className="block text-xs text-slate-600 mt-1">
                      Penarikan uang saku santri disertai struk digital ringkas.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('laporan')}
                    className="bg-white/95 hover:bg-white border border-slate-300 hover:border-[#0b3b8c] rounded-xl p-4 text-left transition-all shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-700">0401 · REKAPITULASI</span>
                    <strong className="block text-sm font-bold text-slate-900 mt-1.5">
                      Laporan &amp; Grafik
                    </strong>
                    <span className="block text-xs text-slate-600 mt-1">
                      Pantau tren transaksi 7 hari terakhir dan unduh rekap CSV.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {activeView === 'kasir' && (
              <TransaksiWorkspace
                jenis="Belanja"
                user={user}
                santriList={santriList}
                transaksiList={transaksiList}
                onTransactionCreated={handleTransactionCreated}
                onShowReceipt={setReceipt}
                onBackHome={() => navigateTo('home')}
                onNotify={notify}
              />
            )}

            {activeView === 'topup' && (
              <TransaksiWorkspace
                jenis="Top Up"
                user={user}
                santriList={santriList}
                transaksiList={transaksiList}
                onTransactionCreated={handleTransactionCreated}
                onShowReceipt={setReceipt}
                onBackHome={() => navigateTo('home')}
                onNotify={notify}
              />
            )}

            {activeView === 'tarik' && (
              <TransaksiWorkspace
                jenis="Tarik Tunai"
                user={user}
                santriList={santriList}
                transaksiList={transaksiList}
                onTransactionCreated={handleTransactionCreated}
                onShowReceipt={setReceipt}
                onBackHome={() => navigateTo('home')}
                onNotify={notify}
              />
            )}

            {activeView === 'mutasi' && (
              <MutasiView
                santriList={santriList}
                transaksiList={transaksiList}
                onBackHome={() => navigateTo('home')}
              />
            )}

            {activeView === 'santri' && user.role === 'admin' && (
              <SantriCrudView
                user={user}
                santriList={santriList}
                onUpdateList={setSantriList}
                onBackHome={() => navigateTo('home')}
                onNotify={notify}
              />
            )}

            {activeView === 'users' && user.role === 'admin' && (
              <UsersCrudView
                currentUser={user}
                usersList={usersList}
                onUpdateUsers={setUsersList}
                onBackHome={() => navigateTo('home')}
                onNotify={notify}
              />
            )}

            {activeView === 'laporan' && (
              <LaporanView
                transaksiList={transaksiList}
                onShowReceipt={setReceipt}
                onBackHome={() => navigateTo('home')}
              />
            )}

            {activeView === 'logs' && user.role === 'admin' && (
              <LogsView logs={logs} onBackHome={() => navigateTo('home')} />
            )}

            {activeView === 'institution' && user.role === 'admin' && (
              <InstitutionSettingsView
                user={user}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onBackHome={() => navigateTo('home')}
                onNotify={notify}
              />
            )}

            {activeView === 'settings' && (
              <ExportCodePanel
                onBackHome={() => navigateTo('home')}
                onNotify={notify}
              />
            )}
          </main>

          {/* Bottom Status Bar */}
          <footer className="bg-slate-900 text-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Petugas:{' '}
                <strong className="text-white">
                  {user.nama_petugas} ({user.role.toUpperCase()})
                </strong>
              </span>
              {user.email && (
                <>
                  <span aria-hidden="true" className="text-slate-600">
                    |
                  </span>
                  <span className="font-mono text-slate-300">{user.email}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono">{liveClockStr}</span>
              <span aria-hidden="true" className="text-slate-600">
                |
              </span>
              <span>
                {settings.nama_lembaga} · Version 1.3.0
              </span>
              <button
                type="button"
                onClick={handleToggleFullscreen}
                aria-pressed={isFullscreen}
                title={isFullscreen ? 'Keluar dari mode layar penuh' : 'Buka mode layar penuh'}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-[11px] font-semibold cursor-pointer transition-colors"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    Keluar Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    Fullscreen
                  </>
                )}
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && user && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex md:hidden">
          <div className="w-72 max-w-[85vw] bg-white h-full p-4 flex flex-col gap-2 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-1">
              <strong className="text-sm text-[#0b3b8c]">Menu Sistem Cashless</strong>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 border border-slate-300 rounded-md text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {[
              { nav: 'home', label: 'Beranda Utama' },
              { nav: 'kasir', label: '0321. Transaksi Kasir / Belanja' },
              { nav: 'topup', label: '0322. Top Up Saldo' },
              { nav: 'tarik', label: '0323. Tarik Tunai' },
              { nav: 'mutasi', label: '0324. Cek Saldo & Mutasi' },
              { nav: 'laporan', label: '0401. Laporan Transaksi' },
              ...(user.role === 'admin'
                ? [
                    { nav: 'santri', label: '0202. Setup Santri & Kartu' },
                    { nav: 'users', label: '0201. Setup Pengguna' },
                    { nav: 'institution', label: '0204. Pengaturan Lembaga & Logo' },
                    { nav: 'logs', label: '0211. Log Sistem' },
                  ]
                : []),
              { nav: 'settings', label: '0205. Ekspor HTML Blogger' },
            ].map((item) => (
              <button
                key={item.nav}
                type="button"
                onClick={() => navigateTo(item.nav as NavView)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold border ${
                  activeView === item.nav
                    ? 'bg-blue-50 border-blue-200 text-[#0b3b8c]'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-auto w-full py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      <ReceiptModal transaksi={receipt} settings={settings} onClose={() => setReceipt(null)} />
    </div>
  );
}
