import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  CalendarRange,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { api, ClientAppState } from './lib/api';
import {
  ALL_CLASS_LEVELS,
  AuthSession,
  ClassLevel,
  SemesterNumber,
  YAYASAN_LOGO_PATH,
} from './types';
import { LoginView } from './components/LoginView';
import { DashboardView, NavPageId } from './components/DashboardView';
import { MaterialsView } from './components/MaterialsView';
import { DailyLogView } from './components/DailyLogView';
import { WeeklyEvalView } from './components/WeeklyEvalView';
import { MonthlyEvalView } from './components/MonthlyEvalView';
import { ReportView } from './components/ReportView';
import { AdminManageView } from './components/AdminManageView';
import { AvatarThumb } from './components/SharedUI';

const SESSION_STORAGE_KEY = 'almaruf_tahfidz_session_v1';

export default function App() {
  const [state, setState] = useState<ClientAppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  });

  const [activePage, setActivePage] = useState<NavPageId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedYearId, setSelectedYearId] = useState<string>('ay-2025-2026');
  const [selectedSemester, setSelectedSemester] = useState<SemesterNumber>(1);
  const [selectedClass, setSelectedClass] = useState<ClassLevel | 'ALL'>('ALL');

  async function fetchInitialState() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getState();
      setState(data);
      const activeYear = data.academicYears.find((y) => y.isActive) || data.academicYears[0];
      if (activeYear) {
        setSelectedYearId(activeYear.id);
        setSelectedSemester(activeYear.activeSemester);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Gagal memuat data program tahfidz.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialState();
  }, []);

  function handleLoginSuccess(nextSession: AuthSession) {
    setSession(nextSession);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    setActivePage('dashboard');
    if (
      nextSession.role === 'GURU_PENDAMPING' &&
      nextSession.teacher &&
      nextSession.teacher.assignedClasses.length === 1
    ) {
      setSelectedClass(nextSession.teacher.assignedClasses[0]);
    } else if (
      (nextSession.role === 'MURID' || nextSession.role === 'ORANG_TUA') &&
      nextSession.student
    ) {
      setSelectedClass(nextSession.student.classLevel);
    } else {
      setSelectedClass('ALL');
    }
  }

  function handleLogout() {
    setSession(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setActivePage('dashboard');
    setMobileMenuOpen(false);
  }

  function handleNavigate(page: NavPageId) {
    setActivePage(page);
    setMobileMenuOpen(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF5] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <img
            src={YAYASAN_LOGO_PATH}
            alt="Logo Yayasan Miftahul Huda Al-Ma'ruf"
            className="w-16 h-16 mx-auto object-contain"
          />
          <p className="text-sm font-semibold text-[#1B7A2B]">
            Memuat Program Tahfidz RA &amp; MI Unggulan Al Ma&apos;ruf...
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !state) {
    return (
      <div className="min-h-screen bg-[#F8FAF5] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#DC2626]/25 p-6 max-w-md text-center space-y-3">
          <p className="text-sm font-bold text-[#DC2626]">
            {loadError || 'Data tidak tersedia.'}
          </p>
          <button
            type="button"
            onClick={fetchInitialState}
            className="px-4 py-2 rounded-xl bg-[#1B7A2B] text-white text-sm font-semibold"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const isFamily = session.role === 'MURID' || session.role === 'ORANG_TUA';
  const isAdmin = session.role === 'ADMIN';

  const navItems: { id: NavPageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Beranda Utama', icon: LayoutDashboard },
    { id: 'materials', label: 'Materi & Audio', icon: BookOpen },
    { id: 'daily', label: 'Harian (Sen–Kam)', icon: CalendarCheck },
    { id: 'weekly', label: "Evaluasi Jum'at", icon: ClipboardCheck },
    { id: 'monthly', label: 'Evaluasi Bulanan', icon: CalendarRange },
    { id: 'reports', label: 'Laporan & Rapor', icon: FileSpreadsheet },
  ];
  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Kelola Madrasah', icon: Settings });
  }

  const roleLabel =
    session.role === 'ADMIN'
      ? 'Admin Madrasah'
      : session.role === 'KEPALA_PROGRAM'
        ? 'Ketua Program / Kepsek'
        : session.role === 'GURU_PENDAMPING'
          ? 'Guru Pendamping'
          : session.role === 'MURID'
            ? 'Murid'
            : 'Orang Tua / Wali';

  const classOptions: ClassLevel[] =
    session.role === 'GURU_PENDAMPING' && session.teacher
      ? session.teacher.assignedClasses
      : isFamily && session.student
        ? [session.student.classLevel]
        : ALL_CLASS_LEVELS;

  return (
    <div className="min-h-screen bg-[#F8FAF5] text-[#1A1D1A] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-[#1B7A2B]/15 sticky top-0 h-screen">
        <div className="p-5 border-b border-[#1B7A2B]/10 flex items-center gap-3">
          <img
            src={YAYASAN_LOGO_PATH}
            alt="Logo Yayasan Miftahul Huda Al-Ma'ruf"
            referrerPolicy="no-referrer"
            className="w-11 h-11 object-contain shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#1B7A2B] truncate">
              Program Tahfidz
            </p>
            <p className="text-xs font-semibold text-[#1A1D1A] truncate">
              RA &amp; MI Al Ma&apos;ruf
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Menu Utama">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#1B7A2B] text-white'
                    : 'text-[#404740] hover:bg-[#F2F6EE] hover:text-[#1A1D1A]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-[#1B7A2B]/10 space-y-3 bg-[#FCFBF5]">
          <div className="flex items-center gap-3 min-w-0">
            <AvatarThumb
              name={session.displayName}
              photoUrl={session.photoUrl}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1A1D1A] truncate">
                {session.displayName}
              </p>
              <p className="text-[11px] font-medium text-[#1B7A2B] truncate">
                {roleLabel} · {session.loginId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-xl border border-[#DC2626]/25 text-[#DC2626] hover:bg-[#DC2626]/5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-6">
        {/* Mobile Header */}
        <header className="no-print lg:hidden bg-[#1B7A2B] text-white px-4 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 shrink-0">
              <img
                src={YAYASAN_LOGO_PATH}
                alt="Logo Al-Ma'ruf"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xs sm:text-sm font-bold truncate">
              Program Tahfidz RA &amp; MI Unggulan Al Ma&apos;ruf
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Buka menu navigasi"
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Global Context Filters Bar */}
        <div className="no-print bg-white border-b border-[#1B7A2B]/15 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-[#1B7A2B]">
                Yayasan Miftahul Huda Al-Ma&apos;ruf · Program Tahfidz RA &amp; MI Unggulan
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                aria-label="Pilih Tahun Ajaran"
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[#1B7A2B]/25 bg-[#FCFBF5] text-xs font-semibold text-[#1A1D1A] font-mono-tabular"
              >
                {state.academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    TA {ay.label}
                  </option>
                ))}
              </select>

              <div className="inline-flex p-0.5 bg-[#F2F6EE] rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedSemester(1)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedSemester === 1
                      ? 'bg-white text-[#1B7A2B] shadow-sm'
                      : 'text-[#4A554A]'
                  }`}
                >
                  Sem 1
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSemester(2)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedSemester === 2
                      ? 'bg-white text-[#1B7A2B] shadow-sm'
                      : 'text-[#4A554A]'
                  }`}
                >
                  Sem 2
                </button>
              </div>

              <select
                aria-label="Pilih Jenjang dan Kelas"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value as ClassLevel | 'ALL')}
                disabled={classOptions.length === 1}
                className="px-2.5 py-1.5 rounded-lg border border-[#1B7A2B]/25 bg-[#FCFBF5] text-xs font-semibold text-[#1A1D1A]"
              >
                {classOptions.length > 1 && (
                  <option value="ALL">Semua Jenjang (RA &amp; MI)</option>
                )}
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activePage === 'dashboard' && (
            <DashboardView
              session={session}
              state={state}
              selectedYearId={selectedYearId}
              selectedSemester={selectedSemester}
              selectedClass={selectedClass}
              onNavigate={handleNavigate}
            />
          )}

          {activePage === 'materials' && (
            <MaterialsView
              session={session}
              state={state}
              selectedClass={selectedClass}
              selectedSemester={selectedSemester}
              onStateChange={setState}
            />
          )}

          {activePage === 'daily' && (
            <DailyLogView
              session={session}
              state={state}
              selectedYearId={selectedYearId}
              selectedSemester={selectedSemester}
              selectedClass={selectedClass}
              onStateChange={setState}
            />
          )}

          {activePage === 'weekly' && (
            <WeeklyEvalView
              session={session}
              state={state}
              selectedYearId={selectedYearId}
              selectedSemester={selectedSemester}
              selectedClass={selectedClass}
              onStateChange={setState}
            />
          )}

          {activePage === 'monthly' && (
            <MonthlyEvalView
              session={session}
              state={state}
              selectedYearId={selectedYearId}
              selectedSemester={selectedSemester}
              selectedClass={selectedClass}
              onStateChange={setState}
            />
          )}

          {activePage === 'reports' && (
            <ReportView
              session={session}
              state={state}
              selectedYearId={selectedYearId}
              selectedSemester={selectedSemester}
              selectedClass={selectedClass}
            />
          )}

          {activePage === 'admin' && isAdmin && (
            <AdminManageView state={state} onStateChange={setState} />
          )}
        </main>
      </div>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden bg-black/50 flex">
          <div className="w-72 bg-white h-full flex flex-col justify-between p-4">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1B7A2B]/10">
                <div className="flex items-center gap-2.5">
                  <img
                    src={YAYASAN_LOGO_PATH}
                    alt="Logo Yayasan"
                    className="w-10 h-10 object-contain"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1B7A2B]">Program Tahfidz</p>
                    <p className="text-xs font-semibold">RA &amp; MI Unggulan Al Ma&apos;ruf</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[#F2F6EE]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 ${
                        active
                          ? 'bg-[#1B7A2B] text-white'
                          : 'text-[#404740] hover:bg-[#F2F6EE]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#1B7A2B]/10 space-y-3">
              <div className="flex items-center gap-3">
                <AvatarThumb
                  name={session.displayName}
                  photoUrl={session.photoUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{session.displayName}</p>
                  <p className="text-[11px] text-[#1B7A2B] truncate">
                    {roleLabel} · {session.loginId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl border border-[#DC2626]/25 text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Compact Mobile Bottom Quick Nav */}
      <nav
        className="no-print lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#1B7A2B]/15 z-30 grid grid-cols-5 py-1.5 px-1"
        aria-label="Navigasi Cepat HP"
      >
        {(
          [
            { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
            { id: 'materials', label: 'Materi', icon: BookOpen },
            { id: 'daily', label: 'Harian', icon: CalendarCheck },
            { id: 'weekly', label: "Jum'at", icon: ClipboardCheck },
            { id: 'reports', label: 'Rapor', icon: FileSpreadsheet },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold ${
                active ? 'text-[#1B7A2B]' : 'text-[#4A554A]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
