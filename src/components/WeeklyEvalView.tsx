import React, { useMemo, useState } from 'react';
import { ClipboardCheck, Plus, Pencil, Trash2, X } from 'lucide-react';
import { api, ClientAppState } from '../lib/api';
import {
  AssessmentStatus,
  AuthSession,
  ClassLevel,
  SemesterNumber,
  WeeklyEvaluation,
} from '../types';
import { AvatarThumb, StatusIndicator } from './SharedUI';

export function WeeklyEvalView({
  session,
  state,
  selectedYearId,
  selectedSemester,
  selectedClass,
  onStateChange,
}: {
  session: AuthSession;
  state: ClientAppState;
  selectedYearId: string;
  selectedSemester: SemesterNumber;
  selectedClass: ClassLevel | 'ALL';
  onStateChange: (next: ClientAppState) => void;
}) {
  const isFamily = session.role === 'MURID' || session.role === 'ORANG_TUA';
  const canEdit = !isFamily;

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

  const [filterWeek, setFilterWeek] = useState<number | 'ALL'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEval, setEditingEval] = useState<WeeklyEvaluation | null>(null);

  const [studentId, setStudentId] = useState('');
  const [weekNumber, setWeekNumber] = useState(1);
  const [fridayDate, setFridayDate] = useState(new Date().toISOString().slice(0, 10));
  const [summaryMaterial, setSummaryMaterial] = useState('');
  const [fluencyScore, setFluencyScore] = useState(88);
  const [tajwidOrAdabScore, setTajwidOrAdabScore] = useState(88);
  const [status, setStatus] = useState<AssessmentStatus>('LANCAR');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function computeSeninKamisSummary(stId: string, wk: number) {
    const logs = state.dailyLogs.filter(
      (d) =>
        d.studentId === stId &&
        d.academicYearId === selectedYearId &&
        d.semester === selectedSemester &&
        d.weekNumber === wk
    );
    const titles = Array.from(new Set(logs.map((l) => `${l.materialTitle} (${l.portionDetail})`)));
    const avg =
      logs.length > 0
        ? Math.round(logs.reduce((acc, l) => acc + l.score, 0) / logs.length)
        : 85;
    return {
      logs,
      summaryText: titles.join(', '),
      avgScore: avg,
    };
  }

  function openNewModal() {
    const firstSt = allowedStudents[0];
    const wk = filterWeek === 'ALL' ? 1 : filterWeek;
    const ref = firstSt ? computeSeninKamisSummary(firstSt.id, wk) : { summaryText: '', avgScore: 85 };

    setEditingEval(null);
    setStudentId(firstSt?.id || '');
    setWeekNumber(wk);
    setFridayDate(new Date().toISOString().slice(0, 10));
    setSummaryMaterial(ref.summaryText || 'Materi Pekanan Juz 30 & Doa Harian');
    setFluencyScore(ref.avgScore);
    setTajwidOrAdabScore(ref.avgScore);
    setStatus(ref.avgScore >= 85 ? 'LANCAR' : ref.avgScore >= 75 ? 'MUROJAAH' : 'BELUM');
    setTeacherNotes('');
    setModalOpen(true);
  }

  function openEditModal(ev: WeeklyEvaluation) {
    setEditingEval(ev);
    setStudentId(ev.studentId);
    setWeekNumber(ev.weekNumber);
    setFridayDate(ev.fridayDate);
    setSummaryMaterial(ev.summaryMaterial);
    setFluencyScore(ev.fluencyScore);
    setTajwidOrAdabScore(ev.tajwidOrAdabScore);
    setStatus(ev.status);
    setTeacherNotes(ev.teacherNotes);
    setModalOpen(true);
  }

  function handleStudentOrWeekChange(nextStId: string, nextWk: number) {
    setStudentId(nextStId);
    setWeekNumber(nextWk);
    if (!editingEval) {
      const ref = computeSeninKamisSummary(nextStId, nextWk);
      if (ref.summaryText) setSummaryMaterial(ref.summaryText);
      setFluencyScore(ref.avgScore);
      setTajwidOrAdabScore(ref.avgScore);
      setStatus(ref.avgScore >= 85 ? 'LANCAR' : ref.avgScore >= 75 ? 'MUROJAAH' : 'BELUM');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !summaryMaterial.trim()) return;
    setSaving(true);
    try {
      const finalScore = Math.round((Number(fluencyScore) + Number(tajwidOrAdabScore)) / 2);
      const teacherId = session.teacher?.id || 'admin';
      const payload: Omit<WeeklyEvaluation, 'id'> = {
        studentId,
        teacherId,
        academicYearId: selectedYearId,
        semester: selectedSemester,
        weekNumber,
        fridayDate,
        summaryMaterial: summaryMaterial.trim(),
        fluencyScore: Number(fluencyScore),
        tajwidOrAdabScore: Number(tajwidOrAdabScore),
        finalScore,
        status,
        teacherNotes: teacherNotes.trim(),
      };

      if (editingEval) {
        const res = await api.updateWeeklyEval(editingEval.id, payload);
        onStateChange(res.state);
      } else {
        const res = await api.createWeeklyEval(payload);
        onStateChange(res.state);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await api.deleteWeeklyEval(id);
    onStateChange(res.state);
  }

  const allowedIds = new Set(allowedStudents.map((s) => s.id));
  const evaluations = state.weeklyEvaluations.filter((w) => {
    if (w.academicYearId !== selectedYearId) return false;
    if (w.semester !== selectedSemester) return false;
    if (!allowedIds.has(w.studentId)) return false;
    if (filterWeek !== 'ALL' && w.weekNumber !== filterWeek) return false;
    return true;
  });

  const modalRefLogs = studentId ? computeSeninKamisSummary(studentId, weekNumber).logs : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#1A1D1A]">
              Evaluasi Mingguan (Setiap Hari Jum&apos;at)
            </h1>
            <p className="text-sm text-[#4A554A] mt-1">
              Rekap dan penilaian ujian pekanan hari Jum&apos;at berdasarkan perkembangan setoran Senin–Kamis.
            </p>
          </div>
          {canEdit && allowedStudents.length > 0 && (
            <button
              type="button"
              onClick={openNewModal}
              className="px-4 py-2.5 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Input Evaluasi Jum&apos;at</span>
            </button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[#1B7A2B]/10 flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-[#4A554A]">Filter Pekan:</label>
          <select
            value={String(filterWeek)}
            onChange={(e) =>
              setFilterWeek(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
            }
            className="px-3 py-1.5 rounded-xl border border-[#1B7A2B]/20 bg-[#FCFBF5] text-sm"
          >
            <option value="ALL">Semua Pekan</option>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((wk) => (
              <option key={wk} value={wk}>
                Pekan ke-{wk}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Evaluations List */}
      <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
        {evaluations.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardCheck className="w-10 h-10 mx-auto text-[#1B7A2B]/35 mb-2" />
            <p className="text-sm font-semibold text-[#1A1D1A]">
              Belum ada evaluasi mingguan (Jum&apos;at) pada periode ini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1B7A2B]/10">
            {evaluations.map((ev) => {
              const st = state.students.find((s) => s.id === ev.studentId);
              const senKamLogs = computeSeninKamisSummary(ev.studentId, ev.weekNumber).logs;
              return (
                <div
                  key={ev.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <AvatarThumb name={st?.name || 'Murid'} photoUrl={st?.photoUrl} size="md" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#1B7A2B] font-semibold">
                        <span>Pekan ke-{ev.weekNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">Jum&apos;at, {ev.fridayDate}</span>
                        <span aria-hidden="true">·</span>
                        <span>{st?.classLevel}</span>
                      </div>
                      <h3 className="text-base font-bold text-[#1A1D1A] mt-0.5">
                        {st?.name || '-'}
                      </h3>
                      <p className="text-sm text-[#1A1D1A] mt-1">
                        <span className="font-semibold">Materi Uji: </span>
                        {ev.summaryMaterial}
                      </p>
                      <p className="text-xs text-[#4A554A] mt-1">
                        Catatan Senin–Kamis pekan ini: {senKamLogs.length} setoran tercatat
                        {ev.teacherNotes ? ` · Catatan Guru: "${ev.teacherNotes}"` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#1B7A2B]/10">
                    <div className="flex items-center gap-4 text-xs font-mono-tabular">
                      <div>
                        <span className="text-[#4A554A] block">Kelancaran</span>
                        <span className="font-bold text-[#1A1D1A] text-sm">{ev.fluencyScore}</span>
                      </div>
                      <div>
                        <span className="text-[#4A554A] block">Tajwid/Adab</span>
                        <span className="font-bold text-[#1A1D1A] text-sm">{ev.tajwidOrAdabScore}</span>
                      </div>
                      <div>
                        <span className="text-[#4A554A] block">Nilai Akhir</span>
                        <span className="font-bold text-[#1B7A2B] text-base">{ev.finalScore}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusIndicator status={ev.status} />
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(ev)}
                            className="p-1.5 rounded-lg text-[#1B7A2B] hover:bg-[#1B7A2B]/10"
                            aria-label="Edit evaluasi"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ev.id)}
                            className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10"
                            aria-label="Hapus evaluasi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#1B7A2B]/20 w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#1B7A2B]/10">
              <h2 className="text-lg font-bold text-[#1A1D1A]">
                {editingEval ? 'Edit Evaluasi Jum’at' : 'Input Evaluasi Mingguan (Jum’at)'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F2F6EE]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Nama Murid
                  </label>
                  <select
                    value={studentId}
                    onChange={(e) => handleStudentOrWeekChange(e.target.value, weekNumber)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                    required
                  >
                    {allowedStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} — {st.classLevel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Pekan ke-
                  </label>
                  <select
                    value={weekNumber}
                    onChange={(e) =>
                      handleStudentOrWeekChange(studentId, Number(e.target.value))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((wk) => (
                      <option key={wk} value={wk}>
                        Pekan {wk}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Automatic Senin-Kamis Context Reference */}
              <div className="p-3.5 rounded-xl bg-[#F8FAF5] border border-[#1B7A2B]/15">
                <p className="text-xs font-bold text-[#1B7A2B] mb-1.5">
                  Ringkasan Setoran Senin–Kamis (Pekan {weekNumber}):
                </p>
                {modalRefLogs.length === 0 ? (
                  <p className="text-xs text-[#4A554A]">
                    Belum ada catatan Senin–Kamis pada pekan ini. Anda tetap bisa mengisi materi evaluasi secara manual.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs text-[#1A1D1A]">
                    {modalRefLogs.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2">
                        <span>
                          <strong>{l.day}:</strong> {l.materialTitle} ({l.portionDetail})
                        </span>
                        <span className="font-mono-tabular font-semibold">{l.score}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                  Tanggal Evaluasi (Jum&apos;at)
                </label>
                <input
                  type="date"
                  value={fridayDate}
                  onChange={(e) => setFridayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                  Ringkasan Materi yang Diuji
                </label>
                <input
                  type="text"
                  value={summaryMaterial}
                  onChange={(e) => setSummaryMaterial(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Kelancaran
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={fluencyScore}
                    onChange={(e) => setFluencyScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm font-mono-tabular"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Tajwid &amp; Adab
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={tajwidOrAdabScore}
                    onChange={(e) => setTajwidOrAdabScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm font-mono-tabular"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Status Evaluasi
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AssessmentStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    <option value="LANCAR">Lancar / Tuntas</option>
                    <option value="MUROJAAH">Perlu Murojaah</option>
                    <option value="BELUM">Belum / Mengulang</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                  Catatan Evaluasi Jum&apos;at untuk Orang Tua
                </label>
                <textarea
                  rows={2}
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Masukan perkembangan dan hal yang perlu dimurojaah di akhir pekan..."
                  className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#1B7A2B]/20 text-sm font-semibold text-[#4A554A]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-sm font-semibold"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Evaluasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
