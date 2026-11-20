import React, { useMemo, useState } from 'react';
import { CalendarRange, Plus, Pencil, Trash2, X } from 'lucide-react';
import { api, ClientAppState } from '../lib/api';
import {
  ALL_PREDICATES,
  AssessmentStatus,
  AuthSession,
  ClassLevel,
  EvaluationPredicate,
  getPredicateFromScore,
  MonthlyEvaluation,
  SEMESTER_1_MONTHS,
  SEMESTER_2_MONTHS,
  SemesterNumber,
} from '../types';
import { AvatarThumb, StatusIndicator } from './SharedUI';

export function MonthlyEvalView({
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
  const semesterMonths = selectedSemester === 1 ? SEMESTER_1_MONTHS : SEMESTER_2_MONTHS;

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

  const [filterMonth, setFilterMonth] = useState<number | 'ALL'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEval, setEditingEval] = useState<MonthlyEvaluation | null>(null);

  const [studentId, setStudentId] = useState('');
  const [monthIndex, setMonthIndex] = useState(1);
  const [juz30ProgressText, setJuz30ProgressText] = useState('');
  const [doaProgressText, setDoaProgressText] = useState('');
  const [averageScore, setAverageScore] = useState(88);
  const [status, setStatus] = useState<AssessmentStatus>('LANCAR');
  const [predicate, setPredicate] =
    useState<EvaluationPredicate>('A- (Sangat Baik)');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function computePredicate(score: number): EvaluationPredicate {
    return getPredicateFromScore(score);
  }

  function openNewModal() {
    const firstSt = allowedStudents[0];
    setEditingEval(null);
    setStudentId(firstSt?.id || '');
    setMonthIndex(filterMonth === 'ALL' ? 1 : filterMonth);
    setJuz30ProgressText('');
    setDoaProgressText('');
    setAverageScore(88);
    setStatus('LANCAR');
    setPredicate('A- (Sangat Baik)');
    setSummaryNotes('');
    setModalOpen(true);
  }

  function openEditModal(ev: MonthlyEvaluation) {
    setEditingEval(ev);
    setStudentId(ev.studentId);
    setMonthIndex(ev.monthIndex);
    setJuz30ProgressText(ev.juz30ProgressText);
    setDoaProgressText(ev.doaProgressText);
    setAverageScore(ev.averageScore);
    setStatus(ev.status);
    setPredicate(ev.predicate);
    setSummaryNotes(ev.summaryNotes);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    setSaving(true);
    try {
      const monthObj = semesterMonths.find((m) => m.index === monthIndex) || semesterMonths[0];
      const payload: Omit<MonthlyEvaluation, 'id'> = {
        studentId,
        teacherId: session.teacher?.id || 'admin',
        academicYearId: selectedYearId,
        semester: selectedSemester,
        monthIndex,
        monthName: monthObj.name,
        juz30ProgressText: juz30ProgressText.trim() || '-',
        doaProgressText: doaProgressText.trim() || '-',
        averageScore: Number(averageScore),
        status,
        predicate,
        summaryNotes: summaryNotes.trim(),
      };

      if (editingEval) {
        const res = await api.updateMonthlyEval(editingEval.id, payload);
        onStateChange(res.state);
      } else {
        const res = await api.createMonthlyEval(payload);
        onStateChange(res.state);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await api.deleteMonthlyEval(id);
    onStateChange(res.state);
  }

  const allowedIds = new Set(allowedStudents.map((s) => s.id));
  const evaluations = state.monthlyEvaluations.filter((m) => {
    if (m.academicYearId !== selectedYearId) return false;
    if (m.semester !== selectedSemester) return false;
    if (!allowedIds.has(m.studentId)) return false;
    if (filterMonth !== 'ALL' && m.monthIndex !== filterMonth) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#1A1D1A]">
              Evaluasi Bulanan Program Tahfidz
            </h1>
            <p className="text-sm text-[#4A554A] mt-1">
              Rekap capaian hafalan Juz 30 dan Doa Harian setiap bulan dalam Semester {selectedSemester}.
            </p>
          </div>
          {canEdit && allowedStudents.length > 0 && (
            <button
              type="button"
              onClick={openNewModal}
              className="px-4 py-2.5 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Input Evaluasi Bulanan</span>
            </button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[#1B7A2B]/10 flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap p-1 bg-[#F2F6EE] rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setFilterMonth('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterMonth === 'ALL'
                  ? 'bg-white text-[#1B7A2B] shadow-sm'
                  : 'text-[#4A554A] hover:text-[#1A1D1A]'
              }`}
            >
              Semua Bulan
            </button>
            {semesterMonths.map((m) => (
              <button
                key={m.index}
                type="button"
                onClick={() => setFilterMonth(m.index)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterMonth === m.index
                    ? 'bg-white text-[#1B7A2B] shadow-sm'
                    : 'text-[#4A554A] hover:text-[#1A1D1A]'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards / Table */}
      <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
        {evaluations.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarRange className="w-10 h-10 mx-auto text-[#1B7A2B]/35 mb-2" />
            <p className="text-sm font-semibold text-[#1A1D1A]">
              Belum ada evaluasi bulanan pada periode ini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1B7A2B]/10">
            {evaluations.map((ev) => {
              const st = state.students.find((s) => s.id === ev.studentId);
              return (
                <div key={ev.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AvatarThumb name={st?.name || 'Murid'} photoUrl={st?.photoUrl} size="md" />
                      <div>
                        <p className="text-xs font-semibold text-[#1B7A2B]">
                          Bulan {ev.monthName} · Semester {ev.semester} · {st?.classLevel}
                        </p>
                        <h3 className="text-base font-bold text-[#1A1D1A]">
                          {st?.name || '-'}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-[#4A554A]">Rata-rata &amp; Predikat</p>
                        <p className="text-sm font-bold text-[#1A1D1A] font-mono-tabular">
                          {ev.averageScore} · {ev.predicate}
                        </p>
                      </div>
                      <StatusIndicator status={ev.status} />
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(ev)}
                            className="p-1.5 rounded-lg text-[#1B7A2B] hover:bg-[#1B7A2B]/10"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ev.id)}
                            className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#F8FAF5] p-3.5 rounded-xl border border-[#1B7A2B]/10">
                    <div>
                      <span className="font-bold text-[#1B7A2B] block mb-0.5">
                        Capaian Juz 30:
                      </span>
                      <span className="text-[#1A1D1A]">{ev.juz30ProgressText}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[#1B7A2B] block mb-0.5">
                        Capaian Doa &amp; Ibadah:
                      </span>
                      <span className="text-[#1A1D1A]">{ev.doaProgressText}</span>
                    </div>
                  </div>

                  {ev.summaryNotes && (
                    <p className="text-xs text-[#4A554A]">
                      <span className="font-semibold text-[#1A1D1A]">Catatan Pembinaan: </span>
                      {ev.summaryNotes}
                    </p>
                  )}
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
                {editingEval ? 'Edit Evaluasi Bulanan' : 'Input Evaluasi Bulanan'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Nama Murid
                  </label>
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
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
                    Bulan (Semester {selectedSemester})
                  </label>
                  <select
                    value={monthIndex}
                    onChange={(e) => setMonthIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    {semesterMonths.map((m) => (
                      <option key={m.index} value={m.index}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                  Ringkasan Progres Al-Qur&apos;an Juz 30
                </label>
                <textarea
                  rows={2}
                  value={juz30ProgressText}
                  onChange={(e) => setJuz30ProgressText(e.target.value)}
                  placeholder="Contoh: Tuntas QS. An-Nas & Al-Ikhlas; Proses QS. Al-Kautsar"
                  className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                  Ringkasan Progres Doa &amp; Bacaan Harian
                </label>
                <textarea
                  rows={2}
                  value={doaProgressText}
                  onChange={(e) => setDoaProgressText(e.target.value)}
                  placeholder="Contoh: Tuntas Doa Sebelum & Sesudah Makan, Doa Tidur"
                  className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Nilai Rata-rata
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={averageScore}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAverageScore(val);
                      setPredicate(computePredicate(val));
                      if (val >= 85) setStatus('LANCAR');
                      else if (val >= 75) setStatus('MUROJAAH');
                      else setStatus('BELUM');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm font-mono-tabular"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Predikat
                  </label>
                  <select
                    value={predicate}
                    onChange={(e) =>
                      setPredicate(e.target.value as EvaluationPredicate)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    {ALL_PREDICATES.map((pred) => (
                      <option key={pred} value={pred}>
                        {pred}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Status
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
                  Catatan Ringkasan Bulan Ini
                </label>
                <textarea
                  rows={2}
                  value={summaryNotes}
                  onChange={(e) => setSummaryNotes(e.target.value)}
                  placeholder="Catatan perkembangan menyeluruh selama bulan ini..."
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
                  {saving ? 'Menyimpan...' : 'Simpan Evaluasi Bulanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
