import React, { useState } from 'react';
import { signInWithPopup, User } from 'firebase/auth';
import { Maximize2, Minimize2, ShieldCheck } from 'lucide-react';
import { InstitutionLogo } from './AlAzharLogo';
import { auth, googleAuthProvider } from '../lib/firebase';
import { setInMemoryAuthToken } from '../services/cashlessApi';
import { InstitutionSettings } from '../types';

interface LoginScreenProps {
  settings: InstitutionSettings;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onAuthSuccess: (firebaseUser: User) => Promise<void>;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  isFullscreen,
  onToggleFullscreen,
  onAuthSuccess,
  onNotify,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const token = await credential.user.getIdToken();
      setInMemoryAuthToken(token);
      await onAuthSuccess(credential.user);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan akun Google. Silakan coba lagi.';
      setErrorMsg(msg);
      onNotify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const locationText = settings.alamat || settings.kota || 'Indonesia';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#eef4f0] to-[#d9eadf]">
      <div className="w-full max-w-[490px] bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xl">
        {/* Header Gelap */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-extrabold tracking-wide text-white">LOGIN SISTEM</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              {settings.subjudul_aplikasi || 'Aplikasi Sistem Informasi Cashless'}
            </p>
          </div>
          <span className="font-mono text-xs text-blue-300 shrink-0">v1.3.0</span>
        </div>

        {/* Banner Lembaga */}
        <div className="flex items-center gap-3.5 px-5 py-4 bg-gradient-to-r from-white via-blue-50 to-blue-100 border-b border-slate-200">
          <InstitutionLogo
            size={54}
            logoUrl={settings.logo_url}
            institutionName={settings.nama_lembaga}
          />
          <div className="min-w-0">
            <div className="text-base font-extrabold text-[#0b3b8c] leading-tight truncate">
              {settings.nama_lembaga}
            </div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
              {locationText}
            </div>
            {settings.telepon && (
              <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                Telp: {settings.telepon}
              </div>
            )}
          </div>
        </div>

        {/* Autentikasi Petugas */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#0b3b8c] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed">
              <strong className="block text-slate-900 text-sm mb-0.5">
                Akses Petugas &amp; Administrator
              </strong>
              Masuk menggunakan akun Google terdaftar untuk mengakses dashboard transaksi, kartu santri, dan laporan keuangan.
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3.5 py-2.5 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full min-h-[46px] px-4 py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-[#0b3b8c] text-slate-900 font-bold text-sm rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{loading ? 'Memverifikasi Akun...' : 'Masuk dengan Google'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Sistem transaksi non-tunai santri terintegrasi.</span>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-pressed={isFullscreen}
              title={
                isFullscreen
                  ? 'Keluar dari mode layar penuh'
                  : 'Buka mode layar penuh untuk tablet kasir'
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-[11px] font-semibold text-slate-700 cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  Keluar Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  Fullscreen
                </>
              )}
            </button>
            <span className="font-mono font-bold text-slate-800 whitespace-nowrap">
              Version 1.3.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
