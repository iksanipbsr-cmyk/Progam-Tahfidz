import React, { useState } from 'react';
import { Lock, UserCheck, Users, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';
import { api } from '../lib/api';
import { AuthSession, YAYASAN_LOGO_PATH } from '../types';

type LoginTab = 'TEACHER' | 'FAMILY' | 'ADMIN';

const DEMO_ACCOUNTS: {
  label: string;
  sublabel: string;
  mode: LoginTab;
  loginId: string;
  password?: string;
}[] = [
  {
    label: 'Admin Madrasah',
    sublabel: 'ADMIN-ALMARUF',
    mode: 'ADMIN',
    loginId: 'ADMIN-ALMARUF',
    password: 'almaruf2025',
  },
  {
    label: 'Ketua Program / Kepsek',
    sublabel: 'KEPSEK-01 (Semua Jenjang)',
    mode: 'TEACHER',
    loginId: 'KEPSEK-01',
  },
  {
    label: 'Wali Kelas RA A',
    sublabel: 'GRU-RAA',
    mode: 'TEACHER',
    loginId: 'GRU-RAA',
  },
  {
    label: 'Wali Kelas MI 1',
    sublabel: 'GRU-MI1',
    mode: 'TEACHER',
    loginId: 'GRU-MI1',
  },
  {
    label: 'Wali Kelas MI 4',
    sublabel: 'GRU-MI4',
    mode: 'TEACHER',
    loginId: 'GRU-MI4',
  },
  {
    label: 'Murid RA A',
    sublabel: 'MRD-RAA-01 (Aisyah)',
    mode: 'FAMILY',
    loginId: 'MRD-RAA-01',
  },
  {
    label: 'Orang Tua MI 4',
    sublabel: 'ORT-MI4-01 (Wali Syifa)',
    mode: 'FAMILY',
    loginId: 'ORT-MI4-01',
  },
];

export function LoginView({
  onLoginSuccess,
}: {
  onLoginSuccess: (session: AuthSession) => void;
}) {
  const [activeTab, setActiveTab] = useState<LoginTab>('TEACHER');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitLogin(
    mode: LoginTab,
    idValue: string,
    passValue?: string
  ) {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({
        mode,
        loginId: idValue,
        password: passValue,
      });
      onLoginSuccess(res.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitLogin(activeTab, loginId, password);
  }

  function handleQuickDemo(item: (typeof DEMO_ACCOUNTS)[number]) {
    setActiveTab(item.mode);
    setLoginId(item.loginId);
    setPassword(item.password || '');
    submitLogin(item.mode, item.loginId, item.password);
  }

  return (
    <div className="min-h-screen bg-[#F8FAF5] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Identity Panel */}
        <div className="lg:col-span-5 bg-[#1B7A2B] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-[#238A35]">
          <div>
            <div className="flex items-center gap-4 pb-6 border-b border-white/15">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white p-1.5 shrink-0 flex items-center justify-center">
                <img
                  src={YAYASAN_LOGO_PATH}
                  alt="Logo Yayasan Miftahul Huda Al-Ma'ruf"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#F5DE2C]">
                  Yayasan Miftahul Huda Al-Ma’ruf
                </p>
                <p className="text-xs text-white/85 mt-0.5">
                  Mayahan – Tawangharjo, Grobogan
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-balance">
                Program Tahfidz RA &amp; MI Unggulan Al Ma&apos;ruf
              </h1>
              <p className="mt-3 text-sm text-white/90 leading-relaxed">
                Sistem terpadu pengelolaan materi Juz 30 &amp; doa harian, catatan setoran Senin–Kamis, evaluasi pekanan Jum&apos;at, evaluasi bulanan, serta cetak rapor resmi berjenjang 2 semester.
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-white/15 space-y-2.5 text-sm text-white/90">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-white/75">Sasaran RA</span>
                <span className="font-semibold text-[#F5DE2C]">RA A · RA B</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-white/75">Sasaran MI</span>
                <span className="font-semibold text-[#F5DE2C]">Kelas 1 – Kelas 6</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-white/75">Siklus Evaluasi</span>
                <span className="font-semibold">Harian · Jum&apos;at · Bulanan · Rapor</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/15 text-xs text-white/75">
            Dusun Sumberjo Rt. 004 Rw. 006 Desa Mayahan Kec. Tawangharjo Kab. Grobogan
          </div>
        </div>

        {/* Right Login Form & Quick Demo Panel */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#1B7A2B]/15 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#1A1D1A]">
                Masuk ke Portal Tahfidz
              </h2>
              <p className="text-sm text-[#4A554A] mt-1">
                Pilih peran akun dan masukkan ID Login yang telah ditetapkan oleh Admin Madrasah.
              </p>
            </div>

            {/* Segmented Control */}
            <div
              className="grid grid-cols-3 gap-1 p-1 bg-[#F2F6EE] rounded-xl mb-6"
              role="tablist"
              aria-label="Pilih tipe pengguna"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'TEACHER'}
                onClick={() => {
                  setActiveTab('TEACHER');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'TEACHER'
                    ? 'bg-white text-[#1B7A2B] shadow-sm'
                    : 'text-[#4A554A] hover:text-[#1A1D1A]'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Guru / Kepsek</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'FAMILY'}
                onClick={() => {
                  setActiveTab('FAMILY');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'FAMILY'
                    ? 'bg-white text-[#1B7A2B] shadow-sm'
                    : 'text-[#4A554A] hover:text-[#1A1D1A]'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Murid &amp; Wali</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ADMIN'}
                onClick={() => {
                  setActiveTab('ADMIN');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'ADMIN'
                    ? 'bg-white text-[#1B7A2B] shadow-sm'
                    : 'text-[#4A554A] hover:text-[#1A1D1A]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Admin</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-id-input"
                  className="block text-sm font-semibold text-[#1A1D1A] mb-1.5"
                >
                  {activeTab === 'ADMIN'
                    ? 'ID Admin Madrasah'
                    : activeTab === 'TEACHER'
                      ? 'ID Login Guru / Ketua Program'
                      : 'ID Login Murid / Orang Tua'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#4A554A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-id-input"
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder={
                      activeTab === 'ADMIN'
                        ? 'Contoh: ADMIN-ALMARUF'
                        : activeTab === 'TEACHER'
                          ? 'Contoh: KEPSEK-01 atau GRU-MI1'
                          : 'Contoh: MRD-RAA-01 atau ORT-MI4-01'
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm font-mono-tabular text-[#1A1D1A] focus:outline-none focus:ring-2 focus:ring-[#1B7A2B]/30 focus:border-[#1B7A2B]"
                    required
                  />
                </div>
              </div>

              {activeTab === 'ADMIN' && (
                <div>
                  <label
                    htmlFor="admin-password-input"
                    className="block text-sm font-semibold text-[#1A1D1A] mb-1.5"
                  >
                    Kata Sandi Admin
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#4A554A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="admin-password-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi Admin"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm text-[#1A1D1A] focus:outline-none focus:ring-2 focus:ring-[#1B7A2B]/30 focus:border-[#1B7A2B]"
                      required
                    />
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/25 text-xs sm:text-sm text-[#DC2626] font-medium"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 min-h-[44px]"
              >
                <span>{loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Quick Demo Accounts */}
          <div className="mt-8 pt-5 border-t border-[#1B7A2B]/10">
            <p className="text-xs font-semibold text-[#4A554A] mb-2.5">
              Uji Coba Cepat Akun Bawaan (Klik untuk langsung masuk):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((item) => (
                <button
                  key={item.loginId}
                  type="button"
                  onClick={() => handleQuickDemo(item)}
                  className="text-left px-3 py-2 rounded-lg border border-[#1B7A2B]/15 hover:border-[#1B7A2B]/40 hover:bg-[#F8FAF5] transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1A1D1A] truncate">
                      {item.label}
                    </p>
                    <p className="text-[11px] font-mono-tabular text-[#1B7A2B] truncate">
                      {item.sublabel}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#1B7A2B] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
