import React, { useMemo, useState } from 'react';
import { Printer, FileSpreadsheet, Users } from 'lucide-react';
import { ClientAppState } from '../lib/api';
import {
  AssessmentStatus,
  AuthSession,
  ClassLevel,
  getPredicateFromScore,
  SEMESTER_1_MONTHS,
  SEMESTER_2_MONTHS,
  SemesterNumber,
} from '../types';
import { AvatarThumb, OfficialKopHeader, StatusIndicator } from './SharedUI';

export function ReportView({
  session,
  state,
  selectedYearId,
  selectedSemester,
  selectedClass,
}: {
  session: AuthSession;
  state: ClientAppState;
  selectedYearId: string;
  selectedSemester: SemesterNumber;
  selectedClass: ClassLevel | 'ALL';
}) {
  const isFamily = session.role === 'MURID' || session.role === 'ORANG_TUA';
  const [reportTab, setReportTab] = useState<'RAPOR' | 'REKAP'>('RAPOR');
  const [periodMode, setPeriodMode] = useState<'SEMESTER' | 'BULANAN'>('SEMESTER');
  const semesterMonths = selectedSemester === 1 ? SEMESTER_1_MONTHS : SEMESTER_2_MONTHS;
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(1);

  const allowedStudents = useMemo(() => {
    return state.students.filter((st) => {
      if (isFamily && session.student) return st.id === session.student.id;
      if (session.role === 'GURU_PENDAMPING' && session.teacher) {
        if (!session.teacher.assignedClasses.includes(st.classLevel)) return false;
      }
      if (selectedClass !== 'ALL' && st.classLevel !== selectedClass) return false;
      return true;
    });
  }, [state.students, session, isFamily, selectedClass]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    allowedStudents[0]?.id || ''
  );

  const activeStudent =
    allowedStudents.find((s) => s.id === selectedStudentId) || allowedStudents[0];

  const activeYearLabel =
    state.academicYears.find((y) => y.id === selectedYearId)?.label || '2025/2026';

  const kepsek =
    state.teachers.find((t) => t.role === 'KEPALA_PROGRAM') || state.teachers[0];

  const classTeacher = activeStudent
    ? state.teachers.find(
        (t) =>
          t.role === 'GURU_PENDAMPING' &&
          t.assignedClasses.includes(activeStudent.classLevel)
      )
    : undefined;

  const activeMonthObj =
    semesterMonths.find((m) => m.index === selectedMonthIndex) || semesterMonths[0];

  // Build individual report data for activeStudent
  const studentReportData = useMemo(() => {
    if (!activeStudent) return null;

    const logs = state.dailyLogs.filter(
      (d) =>
        d.studentId === activeStudent.id &&
        d.academicYearId === selectedYearId &&
        d.semester === selectedSemester
    );
    const weekly = state.weeklyEvaluations.filter(
      (w) =>
        w.studentId === activeStudent.id &&
        w.academicYearId === selectedYearId &&
        w.semester === selectedSemester
    );
    const monthly = state.monthlyEvaluations.filter(
      (m) =>
        m.studentId === activeStudent.id &&
        m.academicYearId === selectedYearId &&
        m.semester === selectedSemester &&
        (periodMode === 'SEMESTER' || m.monthIndex === selectedMonthIndex)
    );

    // Aggregate per material title
    const materialMap = new Map<
      string,
      {
        title: string;
        category: 'JUZ_30' | 'DOA_HARIAN';
        portions: string[];
        scores: number[];
        lastStatus: AssessmentStatus;
      }
    >();

    for (const log of logs) {
      const key = log.materialTitle;
      const existing = materialMap.get(key);
      if (existing) {
        if (!existing.portions.includes(log.portionDetail)) {
          existing.portions.push(log.portionDetail);
        }
        existing.scores.push(log.score);
      } else {
        materialMap.set(key, {
          title: log.materialTitle,
          category: log.category,
          portions: [log.portionDetail],
          scores: [log.score],
          lastStatus: log.status,
        });
      }
    }

    const juz30Rows = Array.from(materialMap.values()).filter(
      (r) => r.category === 'JUZ_30'
    );
    const doaRows = Array.from(materialMap.values()).filter(
      (r) => r.category === 'DOA_HARIAN'
    );

    const allScores = [
      ...logs.map((l) => l.score),
      ...weekly.map((w) => w.finalScore),
      ...monthly.map((m) => m.averageScore),
    ];
    const overallAvg =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;

    const predicate =
      overallAvg > 0 ? getPredicateFromScore(overallAvg) : 'Belum Dinilai';

    return {
      logs,
      weekly,
      monthly,
      juz30Rows,
      doaRows,
      overallAvg,
      predicate,
    };
  }, [
    activeStudent,
    state.dailyLogs,
    state.weeklyEvaluations,
    state.monthlyEvaluations,
    selectedYearId,
    selectedSemester,
    periodMode,
    selectedMonthIndex,
  ]);

  return (
    <div className="space-y-6">
      {/* Control Toolbar (Hidden on Print) */}
      <div className="no-print bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#1A1D1A]">
              Rekapitulasi Laporan &amp; Rapor Tahfidz
            </h1>
            <p className="text-sm text-[#4A554A] mt-1">
              Siap dicetak atau diunduh sebagai PDF dengan Kop Resmi Yayasan Miftahul Huda Al-Ma&apos;ruf.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Unduh PDF</span>
          </button>
        </div>

        <div className="pt-4 border-t border-[#1B7A2B]/10 flex flex-wrap items-center justify-between gap-3">
          {!isFamily && (
            <div className="inline-flex p-1 bg-[#F2F6EE] rounded-xl">
              <button
                type="button"
                onClick={() => setReportTab('RAPOR')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  reportTab === 'RAPOR'
                    ? 'bg-white text-[#1B7A2B] shadow-sm'
                    : 'text-[#4A554A] hover:text-[#1A1D1A]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Rapor Individu Murid</span>
              </button>
              <button
                type="button"
                onClick={() => setReportTab('REKAP')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  reportTab === 'REKAP'
                    ? 'bg-white text-[#1B7A2B] shadow-sm'
                    : 'text-[#4A554A] hover:text-[#1A1D1A]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Rekapitulasi Kelas / Jenjang</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {reportTab === 'RAPOR' && !isFamily && allowedStudents.length > 0 && (
              <select
                value={activeStudent?.id || ''}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-xs sm:text-sm font-medium"
              >
                {allowedStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.classLevel})
                  </option>
                ))}
              </select>
            )}

            <select
              value={periodMode}
              onChange={(e) => setPeriodMode(e.target.value as 'SEMESTER' | 'BULANAN')}
              className="px-3 py-1.5 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-xs sm:text-sm font-medium"
            >
              <option value="SEMESTER">Rapor Per Semester (Semester {selectedSemester})</option>
              <option value="BULANAN">Rapor Per Bulan</option>
            </select>

            {periodMode === 'BULANAN' && (
              <select
                value={selectedMonthIndex}
                onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-xs sm:text-sm font-medium"
              >
                {semesterMonths.map((m) => (
                  <option key={m.index} value={m.index}>
                    Bulan {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Printable Document Sheet */}
      {reportTab === 'RAPOR' || isFamily ? (
        <div className="print-only-full bg-white rounded-2xl border border-[#1B7A2B]/20 p-6 sm:p-10 max-w-4xl mx-auto">
          <OfficialKopHeader
            subtitle={`LAPORAN CAPAIAN HASIL PROGRAM TAHFIDZ ${
              periodMode === 'BULANAN'
                ? `BULAN ${activeMonthObj.name.toUpperCase()}`
                : `SEMESTER ${selectedSemester}`
            }`}
          />

          {!activeStudent || !studentReportData ? (
            <p className="text-center py-10 text-sm text-[#4A554A]">
              Pilih murid terlebih dahulu atau belum ada data murid untuk jenjang ini.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Student Identity */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FCFBF5] border border-[#1B7A2B]/15 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs sm:text-sm flex-1">
                  <div className="flex gap-2">
                    <span className="text-[#4A554A] w-28 shrink-0">Nama Murid</span>
                    <span className="font-bold text-[#1A1D1A]">: {activeStudent.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#4A554A] w-28 shrink-0">Tahun Ajaran</span>
                    <span className="font-semibold text-[#1A1D1A] font-mono-tabular">
                      : {activeYearLabel}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#4A554A] w-28 shrink-0">NIS / ID</span>
                    <span className="font-mono-tabular text-[#1A1D1A]">
                      : {activeStudent.nis || activeStudent.studentLoginId}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#4A554A] w-28 shrink-0">Semester</span>
                    <span className="font-semibold text-[#1A1D1A]">
                      : Semester {selectedSemester}
                      {periodMode === 'BULANAN' ? ` (${activeMonthObj.name})` : ''}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#4A554A] w-28 shrink-0">Jenjang / Kelas</span>
                    <span className="font-semibold text-[#1B7A2B]">
                      :{' '}
                      {activeStudent.institution === 'RA'
                        ? activeStudent.classLevel
                        : `${activeStudent.institution} ${activeStudent.classLevel}`}{' '}
                      Unggulan Al Ma&apos;ruf
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#4A554A] w-28 shrink-0">Nama Wali</span>
                    <span className="text-[#1A1D1A]">: {activeStudent.parentName}</span>
                  </div>
                </div>
                <div className="shrink-0 self-start sm:self-center">
                  <AvatarThumb
                    name={activeStudent.name}
                    photoUrl={activeStudent.photoUrl}
                    size="xl"
                  />
                </div>
              </div>

              {/* A. Capaian Al-Qur'an Juz 30 */}
              <div className="print-break-inside-avoid">
                <h3 className="text-sm font-bold text-[#1B7A2B] mb-2">
                  A. Capaian Hafalan Al-Qur&apos;an Juz 30
                </h3>
                <table className="w-full text-left border-collapse border border-[#1A1D1A]/25 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#1B7A2B]/10 text-[#1A1D1A]">
                      <th className="border border-[#1A1D1A]/20 px-3 py-2 w-10 text-center">
                        No
                      </th>
                      <th className="border border-[#1A1D1A]/20 px-3 py-2">Nama Surah</th>
                      <th className="border border-[#1A1D1A]/20 px-3 py-2">Bagian / Ayat</th>
                      <th className="border border-[#1A1D1A]/20 px-3 py-2 w-20 text-center">
                        Nilai
                      </th>
                      <th className="border border-[#1A1D1A]/20 px-3 py-2 w-40">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentReportData.juz30Rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="border border-[#1A1D1A]/20 px-3 py-4 text-center text-[#4A554A]"
                        >
                          Belum ada setoran Juz 30 tercatat pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      studentReportData.juz30Rows.map((row, i) => {
                        const avg = Math.round(
                          row.scores.reduce((a, b) => a + b, 0) / row.scores.length
                        );
                        return (
                          <tr key={row.title}>
                            <td className="border border-[#1A1D1A]/20 px-3 py-2 text-center font-mono-tabular">
                              {i + 1}
                            </td>
                            <td className="border border-[#1A1D1A]/20 px-3 py-2 font-semibold">
                              {row.title}
                            </td>
                            <td className="border border-[#1A1D1A]/20 px-3 py-2">
                              {row.portions.join(', ')}
                            </td>
                            <td className="border border-[#1A1D1A]/20 px-3 py-2 text-center font-mono-tabular font-bold">
                              {avg}
                            </td>
                            <td className="border border-[#1A1D1A]/20 px-3 py-2">
                              <StatusIndicator status={row.lastStatus} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* B. Capaian Doa & Bacaan Ibadah */}
              <div className="print-break-inside-avoid">
                <h3 className="text-sm font-bold text-[#1B7A2B] mb-2">
                  B. Capaian Hafalan Doa &amp; Bacaan Ibadah Harian
                </h3>
                <table className="w-full text-left border-collapse border border-[#1A1D1A]/25 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#1B7A2B]/10 text-[#1A1D1A]">
                      <th className="border border-[#1A1D1A]/20 px-3 py-2 w-10 text-center">
                        No
                      </th>
                      <th className="border border-[#1A1D1A]/20 px-3 py-2">Materi Doa / Niat</th>
                      <th className="border border-[#1A1D1A]/20 px-3 py-2">Cakupan</th>
                      <th className="border border-[#1A1D1A]/20 px-3 py-2 w-20 text-center">
                        Nilai
                      </th>
                      <th className="border border-[#1A1D1A]/20 px-3 py-2 w-40">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentReportData.doaRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="border border-[#1A1D1A]/20 px-3 py-4 text-center text-[#4A554A]"
                        >
                          Belum ada setoran Doa Harian tercatat pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      studentReportData.doaRows.map((row, i) => {
                        const avg = Math.round(
                          row.scores.reduce((a, b) => a + b, 0) / row.scores.length
                        );
                        return (
                          <tr key={row.title}>
                            <td className="border border-[#1A1D1A]/20 px-3 py-2 text-center font-mono-tabular">
                              {i + 1}
                            </td>
                            <td className="border border-[#1A1D1A]/20 px-3 py-2 font-semibold">
                              {row.title}
                            </td>
                            <td className="border border-[#1A1D1A]/20 px-3 py-2">
                              {row.portions.join(', ')}
                            </td>
                            <td className="border border-[#1A1D1A]/20 px-3 py-2 text-center font-mono-tabular font-bold">
                              {avg}
                            </td>
                            <td className="border border-[#1A1D1A]/20 px-3 py-2">
                              <StatusIndicator status={row.lastStatus} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* C. Rekap Evaluasi & Predikat */}
              <div className="print-break-inside-avoid grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FCFBF5] border border-[#E6C200]/45 rounded-xl p-4">
                <div>
                  <p className="text-xs text-[#4A554A]">Rata-Rata Nilai Tahfidz</p>
                  <p className="text-2xl font-bold text-[#1B7A2B] font-mono-tabular mt-0.5">
                    {studentReportData.overallAvg || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#4A554A]">Predikat Capaian</p>
                  <p className="text-lg font-bold text-[#1A1D1A] mt-0.5">
                    {studentReportData.predicate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#4A554A]">Jumlah Evaluasi Pekanan &amp; Bulanan</p>
                  <p className="text-sm font-semibold text-[#1A1D1A] mt-1 font-mono-tabular">
                    {studentReportData.weekly.length} Pekanan ·{' '}
                    {studentReportData.monthly.length} Bulanan
                  </p>
                </div>
              </div>

              {/* Catatan Guru */}
              <div className="print-break-inside-avoid border border-[#1A1D1A]/20 rounded-xl p-4 text-xs sm:text-sm">
                <p className="font-bold text-[#1A1D1A] mb-1">
                  Catatan Pembinaan Ustadz / Ustadzah:
                </p>
                <p className="text-[#404740] leading-relaxed">
                  {studentReportData.monthly[0]?.summaryNotes ||
                    studentReportData.weekly[0]?.teacherNotes ||
                    'Terus semangat menjaga murojaah hafalan Al-Qur’an dan pembiasaan doa harian bersama keluarga di rumah.'}
                </p>
              </div>

              {/* Signatures */}
              <div className="print-break-inside-avoid pt-6 grid grid-cols-3 gap-4 text-center text-xs sm:text-sm">
                <div>
                  <p className="text-[#4A554A]">Mengetahui,</p>
                  <p className="font-semibold text-[#1A1D1A]">
                    Kepala / Ketua Program
                  </p>
                  <div className="h-16" />
                  <p className="font-bold underline text-[#1A1D1A]">
                    {kepsek?.name || 'Ustadz H. Ahmad Fauzan, S.Pd.I'}
                  </p>
                </div>

                <div>
                  <p className="text-[#4A554A]">Orang Tua / Wali Murid</p>
                  <p className="font-semibold text-[#1A1D1A]">Menyetujui</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-[#1A1D1A]">
                    {activeStudent.parentName}
                  </p>
                </div>

                <div>
                  <p className="text-[#4A554A]">Mayahan, Grobogan</p>
                  <p className="font-semibold text-[#1A1D1A]">
                    Guru Pendamping / Wali Kelas
                  </p>
                  <div className="h-16" />
                  <p className="font-bold underline text-[#1A1D1A]">
                    {classTeacher?.name || 'Ustadz / Ustadzah Tahfidz'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Rekapitulasi Laporan Kelas / Jenjang */
        <div className="print-only-full bg-white rounded-2xl border border-[#1B7A2B]/20 p-6 sm:p-10">
          <OfficialKopHeader
            subtitle={`REKAPITULASI LAPORAN PROGRAM TAHFIDZ · ${
              selectedClass === 'ALL' ? 'SEMUA JENJANG (RA A–B & MI KELAS 1–6)' : selectedClass.toUpperCase()
            } · TA ${activeYearLabel} · SEMESTER ${selectedSemester}`}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-[#1A1D1A]/25 text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#1B7A2B]/10 text-[#1A1D1A]">
                  <th className="border border-[#1A1D1A]/20 px-3 py-2 w-10 text-center">
                    No
                  </th>
                  <th className="border border-[#1A1D1A]/20 px-3 py-2">Nama Murid</th>
                  <th className="border border-[#1A1D1A]/20 px-3 py-2">Jenjang</th>
                  <th className="border border-[#1A1D1A]/20 px-3 py-2 text-center">
                    Setoran Harian
                  </th>
                  <th className="border border-[#1A1D1A]/20 px-3 py-2 text-center">
                    Eval. Jum&apos;at
                  </th>
                  <th className="border border-[#1A1D1A]/20 px-3 py-2 text-center">
                    Rata-Rata
                  </th>
                  <th className="border border-[#1A1D1A]/20 px-3 py-2">
                    Progres Terakhir / Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {allowedStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border border-[#1A1D1A]/20 px-3 py-6 text-center text-[#4A554A]"
                    >
                      Tidak ada data murid pada filter ini.
                    </td>
                  </tr>
                ) : (
                  allowedStudents.map((st, idx) => {
                    const logs = state.dailyLogs.filter(
                      (d) =>
                        d.studentId === st.id &&
                        d.academicYearId === selectedYearId &&
                        d.semester === selectedSemester
                    );
                    const weekly = state.weeklyEvaluations.filter(
                      (w) =>
                        w.studentId === st.id &&
                        w.academicYearId === selectedYearId &&
                        w.semester === selectedSemester
                    );
                    const avg =
                      logs.length > 0
                        ? Math.round(
                            logs.reduce((a, b) => a + b.score, 0) / logs.length
                          )
                        : 0;
                    const latest = logs[0];
                    return (
                      <tr key={st.id}>
                        <td className="border border-[#1A1D1A]/20 px-3 py-2 text-center font-mono-tabular">
                          {idx + 1}
                        </td>
                        <td className="border border-[#1A1D1A]/20 px-3 py-2 font-semibold">
                          {st.name}
                        </td>
                        <td className="border border-[#1A1D1A]/20 px-3 py-2">
                          {st.classLevel}
                        </td>
                        <td className="border border-[#1A1D1A]/20 px-3 py-2 text-center font-mono-tabular">
                          {logs.length}x
                        </td>
                        <td className="border border-[#1A1D1A]/20 px-3 py-2 text-center font-mono-tabular">
                          {weekly.length}x
                        </td>
                        <td className="border border-[#1A1D1A]/20 px-3 py-2 text-center font-mono-tabular font-bold">
                          {avg || '-'}
                        </td>
                        <td className="border border-[#1A1D1A]/20 px-3 py-2">
                          {latest ? (
                            <div className="space-y-0.5">
                              <p className="font-medium text-xs">
                                {latest.materialTitle} ({latest.portionDetail})
                              </p>
                              <StatusIndicator status={latest.status} />
                            </div>
                          ) : (
                            <span className="text-xs text-[#4A554A]">
                              Belum ada setoran
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="print-break-inside-avoid pt-8 flex justify-end text-center text-xs sm:text-sm">
            <div className="w-64">
              <p className="text-[#4A554A]">Mayahan, Tawangharjo, Grobogan</p>
              <p className="font-semibold text-[#1A1D1A]">
                Ketua Program Tahfidz / Kepala Madrasah
              </p>
              <div className="h-16" />
              <p className="font-bold underline text-[#1A1D1A]">
                {kepsek?.name || 'Ustadz H. Ahmad Fauzan, S.Pd.I'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
