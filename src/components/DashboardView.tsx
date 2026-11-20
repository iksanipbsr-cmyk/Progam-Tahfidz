import React from 'react';
import {
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  FileSpreadsheet,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import { ClientAppState } from '../lib/api';
import {
  AuthSession,
  ClassLevel,
  SemesterNumber,
} from '../types';
import { AvatarThumb, StatusIndicator } from './SharedUI';

export type NavPageId =
  | 'dashboard'
  | 'materials'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'reports'
  | 'admin';

export function DashboardView({
  session,
  state,
  selectedYearId,
  selectedSemester,
  selectedClass,
  onNavigate,
}: {
  session: AuthSession;
  state: ClientAppState;
  selectedYearId: string;
  selectedSemester: SemesterNumber;
  selectedClass: ClassLevel | 'ALL';
  onNavigate: (page: NavPageId) => void;
}) {
  const isFamily = session.role === 'MURID' || session.role === 'ORANG_TUA';

  const visibleStudents = state.students.filter((st) => {
    if (isFamily && session.student) {
      return st.id === session.student.id;
    }
    if (session.role === 'GURU_PENDAMPING' && session.teacher) {
      const allowed = session.teacher.assignedClasses;
      if (!allowed.includes(st.classLevel)) return false;
    }
    if (selectedClass !== 'ALL' && st.classLevel !== selectedClass) return false;
    return true;
  });

  const visibleStudentIds = new Set(visibleStudents.map((s) => s.id));

  const filteredDaily = state.dailyLogs.filter(
    (d) =>
      d.academicYearId === selectedYearId &&
      d.semester === selectedSemester &&
      visibleStudentIds.has(d.studentId)
  );

  const filteredWeekly = state.weeklyEvaluations.filter(
    (w) =>
      w.academicYearId === selectedYearId &&
      w.semester === selectedSemester &&
      visibleStudentIds.has(w.studentId)
  );

  const filteredMonthly = state.monthlyEvaluations.filter(
    (m) =>
      m.academicYearId === selectedYearId &&
      m.semester === selectedSemester &&
      visibleStudentIds.has(m.studentId)
  );

  const lancarCount = filteredDaily.filter((d) => d.status === 'LANCAR').length;
  const lancarRate =
    filteredDaily.length > 0
      ? Math.round((lancarCount / filteredDaily.length) * 100)
      : 0;

  const activeYearLabel =
    state.academicYears.find((y) => y.id === selectedYearId)?.label || '-';

  return (
    <div className="space-y-6">
      {/* Main Hero Banner */}
      <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#1B7A2B]">
            <span>Tahun Ajaran {activeYearLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Semester {selectedSemester}</span>
            <span aria-hidden="true">·</span>
            <span>
              {selectedClass === 'ALL' ? 'Semua Jenjang (RA & MI)' : selectedClass}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1D1A] tracking-tight text-balance">
            Program Tahfidz RA &amp; MI Unggulan Al Ma&apos;ruf
          </h1>
          <p className="text-sm text-[#4A554A] leading-relaxed">
            {isFamily && session.student
              ? `Selamat datang di portal pantauan hafalan ${session.student.name} (${session.student.classLevel}). Akses rangkuman materi teks & audio, catatan Senin–Kamis, evaluasi Jum'at, serta rapor resmi.`
              : session.role === 'KEPALA_PROGRAM'
                ? 'Akses penuh Ketua Program / Kepala Sekolah untuk memantau capaian dan melakukan evaluasi tahfidz seluruh jenjang RA A, RA B, hingga MI Kelas 1–6 lintas semester.'
                : session.role === 'GURU_PENDAMPING'
                  ? `Panel Guru Pendamping untuk pencatatan setoran harian Senin–Kamis, evaluasi mingguan Jum'at, evaluasi bulanan, dan rekap kelas binaan.`
                  : 'Panel Administrasi Yayasan Miftahul Huda Al-Ma’ruf untuk pengelolaan tahun ajaran, materi teks & audio, akun guru, profil murid, serta rapor resmi.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('materials')}
            className="px-4 py-2.5 rounded-xl border border-[#1B7A2B]/25 text-[#1B7A2B] hover:bg-[#1B7A2B]/5 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" />
            <span>Materi &amp; Audio</span>
          </button>
          {!isFamily ? (
            <button
              type="button"
              onClick={() => onNavigate('daily')}
              className="px-4 py-2.5 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Input Catatan Harian</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="px-4 py-2.5 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Lihat Rapor Anak</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Column KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#1B7A2B]/15 p-4 sm:p-5">
          <p className="text-xs font-medium text-[#4A554A]">
            {isFamily ? 'Profil Terhubung' : 'Murid Terpantau'}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#1A1D1A] mt-1 tabular-nums">
            {visibleStudents.length}
          </p>
          <p className="text-xs text-[#1B7A2B] mt-1 font-medium">
            {isFamily && session.student
              ? `${session.student.classLevel} · ${session.student.institution}`
              : 'RA A/B & MI Kelas 1–6'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#1B7A2B]/15 p-4 sm:p-5">
          <p className="text-xs font-medium text-[#4A554A]">
            Catatan Senin–Kamis
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#1A1D1A] mt-1 tabular-nums">
            {filteredDaily.length}
          </p>
          <p className="text-xs text-[#4A554A] mt-1">
            Setoran &amp; murojaah harian
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#1B7A2B]/15 p-4 sm:p-5">
          <p className="text-xs font-medium text-[#4A554A]">
            Evaluasi Jum&apos;at
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#1A1D1A] mt-1 tabular-nums">
            {filteredWeekly.length}
          </p>
          <p className="text-xs text-[#4A554A] mt-1">
            Rekap pekanan · {filteredMonthly.length} bulanan
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#1B7A2B]/15 p-4 sm:p-5">
          <p className="text-xs font-medium text-[#4A554A]">
            Ketuntasan Setoran
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#16A34A] mt-1 tabular-nums">
            {lancarRate}%
          </p>
          <p className="text-xs text-[#4A554A] mt-1">
            {lancarCount} dari {filteredDaily.length} setoran lancar
          </p>
        </div>
      </div>

      {/* Program Workflow & Student Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Alur Evaluasi Berjenjang */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
          <h2 className="text-base font-bold text-[#1A1D1A] mb-1">
            Alur Program Tahfidz Mingguan &amp; Semester
          </h2>
          <p className="text-xs text-[#4A554A] mb-5">
            Siklus pembinaan terpadu antara Guru Tahfidz dan Orang Tua
          </p>

          <div className="divide-y divide-[#1B7A2B]/10">
            <button
              type="button"
              onClick={() => onNavigate('daily')}
              className="w-full py-3.5 text-left flex items-start justify-between gap-3 hover:bg-[#F8FAF5] rounded-lg px-2 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[#1A1D1A]">
                  1. Catatan Harian (Senin – Kamis)
                </p>
                <p className="text-xs text-[#4A554A] mt-0.5">
                  Setoran baru &amp; murojaah materi Juz 30 serta Doa Harian
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#1B7A2B] shrink-0 mt-1" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('weekly')}
              className="w-full py-3.5 text-left flex items-start justify-between gap-3 hover:bg-[#F8FAF5] rounded-lg px-2 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[#1A1D1A]">
                  2. Evaluasi Mingguan (Hari Jum&apos;at)
                </p>
                <p className="text-xs text-[#4A554A] mt-0.5">
                  Uji kelancaran, tajwid, dan adab dari akumulasi Senin–Kamis
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#1B7A2B] shrink-0 mt-1" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('monthly')}
              className="w-full py-3.5 text-left flex items-start justify-between gap-3 hover:bg-[#F8FAF5] rounded-lg px-2 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[#1A1D1A]">
                  3. Evaluasi Bulanan (Semester 1 &amp; 2)
                </p>
                <p className="text-xs text-[#4A554A] mt-0.5">
                  Rekap capaian bulanan beserta predikat dan catatan pembinaan
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#1B7A2B] shrink-0 mt-1" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="w-full py-3.5 text-left flex items-start justify-between gap-3 hover:bg-[#F8FAF5] rounded-lg px-2 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[#1A1D1A]">
                  4. Rekapitulasi Laporan &amp; Cetak Rapor
                </p>
                <p className="text-xs text-[#4A554A] mt-0.5">
                  Rapor resmi berkop Yayasan Miftahul Huda Al-Ma’ruf siap PDF/cetak
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#1B7A2B] shrink-0 mt-1" />
            </button>
          </div>
        </div>

        {/* Right: Daftar Murid / Progres Terakhir */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#1A1D1A]">
                {isFamily ? 'Ringkasan Setoran Terakhir' : 'Daftar Santri & Capaian Terakhir'}
              </h2>
              <p className="text-xs text-[#4A554A] mt-0.5">
                {visibleStudents.length} murid pada filter aktif
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-[#1B7A2B] hover:underline whitespace-nowrap"
            >
              Lihat Rekap Lengkap
            </button>
          </div>

          {visibleStudents.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#4A554A]">
              <GraduationCap className="w-8 h-8 mx-auto text-[#1B7A2B]/40 mb-2" />
              Belum ada data murid untuk filter jenjang ini.
            </div>
          ) : (
            <div className="divide-y divide-[#1B7A2B]/10 max-h-[340px] overflow-y-auto pr-1">
              {visibleStudents.map((st) => {
                const latestLog = filteredDaily.find((d) => d.studentId === st.id);
                return (
                  <div
                    key={st.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarThumb name={st.name} photoUrl={st.photoUrl} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1A1D1A] truncate">
                          {st.name}
                        </p>
                        <p className="text-xs text-[#4A554A] truncate">
                          {st.classLevel} · Wali: {st.parentName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      {latestLog ? (
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-semibold text-[#1A1D1A]">
                            {latestLog.materialTitle}
                          </p>
                          <div className="mt-0.5">
                            <StatusIndicator status={latestLog.status} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#4A554A]">
                          Belum ada setoran semester ini
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Logs Strip */}
      <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-bold text-[#1A1D1A]">
            Aktivitas Catatan &amp; Evaluasi Terbaru
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('daily')}
            className="text-xs font-semibold text-[#1B7A2B] hover:underline whitespace-nowrap"
          >
            Buka Buku Harian
          </button>
        </div>

        {filteredDaily.length === 0 ? (
          <p className="text-sm text-[#4A554A] py-6 text-center">
            Belum ada catatan harian pada semester dan jenjang yang dipilih.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1B7A2B]/15 text-xs font-semibold text-[#4A554A]">
                  <th className="py-2.5 pr-4">Hari &amp; Tanggal</th>
                  <th className="py-2.5 pr-4">Nama Murid</th>
                  <th className="py-2.5 pr-4">Materi</th>
                  <th className="py-2.5 pr-4">Nilai</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B7A2B]/10 text-sm">
                {filteredDaily.slice(0, 6).map((log) => {
                  const st = state.students.find((s) => s.id === log.studentId);
                  return (
                    <tr key={log.id} className="hover:bg-[#F8FAF5]/70">
                      <td className="py-2.5 pr-4 whitespace-nowrap text-xs text-[#4A554A] tabular-nums">
                        {log.day}, {log.date} · Pekan {log.weekNumber}
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-[#1A1D1A] whitespace-nowrap">
                        {st?.name || '-'}
                      </td>
                      <td className="py-2.5 pr-4 text-[#1A1D1A]">
                        <span className="font-medium">{log.materialTitle}</span>
                        <span className="text-xs text-[#4A554A] ml-1.5">
                          ({log.portionDetail})
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono-tabular font-semibold text-[#1A1D1A]">
                        {log.score}
                      </td>
                      <td className="py-2.5">
                        <StatusIndicator status={log.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
