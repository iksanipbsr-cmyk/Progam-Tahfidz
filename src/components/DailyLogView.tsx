import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, CalendarCheck, X } from 'lucide-react';
import { api, ClientAppState } from '../lib/api';
import {
  AssessmentStatus,
  AuthSession,
  ClassLevel,
  DAILY_DAYS,
  DailyDay,
  DailyLog,
  MaterialCategory,
  SemesterNumber,
} from '../types';
import { AvatarThumb, StatusIndicator } from './SharedUI';

export function DailyLogView({
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
  const [filterDay, setFilterDay] = useState<DailyDay | 'ALL'>('ALL');
  const [filterStudentId, setFilterStudentId] = useState<string>('ALL');

  // Modal Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [studentId, setStudentId] = useState('');
  const [weekNumber, setWeekNumber] = useState(1);
  const [day, setDay] = useState<DailyDay>('Senin');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<MaterialCategory>('JUZ_30');
  const [materialId, setMaterialId] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [portionDetail, setPortionDetail] = useState('');
  const [logType, setLogType] = useState<'SETORAN_BARU' | 'MUROJAAH'>('SETORAN_BARU');
  const [score, setScore] = useState(88);
  const [status, setStatus] = useState<AssessmentStatus>('LANCAR');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const materialsByCat = useMemo(
    () => state.materials.filter((m) => m.category === category),
    [state.materials, category]
  );

  function openNewModal() {
    const firstSt = allowedStudents[0];
    const firstMat = state.materials.find((m) => m.category === 'JUZ_30');
    setEditingLog(null);
    setStudentId(firstSt?.id || '');
    setWeekNumber(filterWeek === 'ALL' ? 1 : filterWeek);
    setDay(filterDay === 'ALL' ? 'Senin' : filterDay);
    setDate(new Date().toISOString().slice(0, 10));
    setCategory('JUZ_30');
    setMaterialId(firstMat?.id || '');
    setMaterialTitle(firstMat?.title || '');
    setPortionDetail('Ayat 1–5');
    setLogType('SETORAN_BARU');
    setScore(88);
    setStatus('LANCAR');
    setNotes('');
    setModalOpen(true);
  }

  function openEditModal(log: DailyLog) {
    setEditingLog(log);
    setStudentId(log.studentId);
    setWeekNumber(log.weekNumber);
    setDay(log.day);
    setDate(log.date);
    setCategory(log.category);
    setMaterialId(log.materialId || '');
    setMaterialTitle(log.materialTitle);
    setPortionDetail(log.portionDetail);
    setLogType(log.logType);
    setScore(log.score);
    setStatus(log.status);
    setNotes(log.notes);
    setModalOpen(true);
  }

  function handleCategoryChange(nextCat: MaterialCategory) {
    setCategory(nextCat);
    const firstMat = state.materials.find((m) => m.category === nextCat);
    setMaterialId(firstMat?.id || '');
    setMaterialTitle(firstMat?.title || '');
  }

  function handleMaterialSelect(id: string) {
    setMaterialId(id);
    const found = state.materials.find((m) => m.id === id);
    if (found) setMaterialTitle(found.title);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !materialTitle.trim()) return;
    setSaving(true);
    try {
      const teacherId =
        session.teacher?.id ||
        state.teachers.find((t) =>
          t.assignedClasses.includes(
            state.students.find((s) => s.id === studentId)?.classLevel || 'RA A'
          )
        )?.id ||
        'admin';

      const payload: Omit<DailyLog, 'id'> = {
        studentId,
        teacherId,
        academicYearId: selectedYearId,
        semester: selectedSemester,
        weekNumber,
        day,
        date,
        category,
        materialId: materialId || undefined,
        materialTitle: materialTitle.trim(),
        portionDetail: portionDetail.trim() || 'Setoran Penuh',
        logType,
        score: Number(score),
        status,
        notes: notes.trim(),
      };

      if (editingLog) {
        const res = await api.updateDailyLog(editingLog.id, payload);
        onStateChange(res.state);
      } else {
        const res = await api.createDailyLog(payload);
        onStateChange(res.state);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await api.deleteDailyLog(id);
    onStateChange(res.state);
  }

  const allowedIds = new Set(allowedStudents.map((s) => s.id));
  const logs = state.dailyLogs.filter((d) => {
    if (d.academicYearId !== selectedYearId) return false;
    if (d.semester !== selectedSemester) return false;
    if (!allowedIds.has(d.studentId)) return false;
    if (filterWeek !== 'ALL' && d.weekNumber !== filterWeek) return false;
    if (filterDay !== 'ALL' && d.day !== filterDay) return false;
    if (filterStudentId !== 'ALL' && d.studentId !== filterStudentId) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#1A1D1A]">
              Catatan Harian Tahfidz (Senin – Kamis)
            </h1>
            <p className="text-sm text-[#4A554A] mt-1">
              Pencatatan setoran baru &amp; murojaah harian sebagai dasar Evaluasi Mingguan hari Jum&apos;at.
            </p>
          </div>
          {canEdit && allowedStudents.length > 0 && (
            <button
              type="button"
              onClick={openNewModal}
              className="px-4 py-2.5 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Setoran Harian</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-5 pt-4 border-t border-[#1B7A2B]/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#4A554A] mb-1">
              Filter Pekan
            </label>
            <select
              value={String(filterWeek)}
              onChange={(e) =>
                setFilterWeek(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/20 bg-[#FCFBF5] text-sm"
            >
              <option value="ALL">Semua Pekan</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((wk) => (
                <option key={wk} value={wk}>
                  Pekan ke-{wk}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A554A] mb-1">
              Filter Hari (Senin – Kamis)
            </label>
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value as DailyDay | 'ALL')}
              className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/20 bg-[#FCFBF5] text-sm"
            >
              <option value="ALL">Semua Hari (Senin – Kamis)</option>
              {DAILY_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {!isFamily && (
            <div>
              <label className="block text-xs font-semibold text-[#4A554A] mb-1">
                Filter Murid
              </label>
              <select
                value={filterStudentId}
                onChange={(e) => setFilterStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/20 bg-[#FCFBF5] text-sm"
              >
                <option value="ALL">Semua Murid ({allowedStudents.length})</option>
                {allowedStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.classLevel})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Table / Responsive List */}
      <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
        {logs.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarCheck className="w-10 h-10 mx-auto text-[#1B7A2B]/35 mb-2" />
            <p className="text-sm font-semibold text-[#1A1D1A]">
              Belum ada catatan harian untuk filter ini.
            </p>
            {canEdit && allowedStudents.length > 0 && (
              <button
                type="button"
                onClick={openNewModal}
                className="mt-3 px-4 py-2 rounded-xl bg-[#1B7A2B] text-white text-xs font-semibold"
              >
                + Tambah Catatan Pertama
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1B7A2B]/15 text-xs font-semibold text-[#4A554A]">
                    <th className="py-2.5 pr-3">Pekan &amp; Hari</th>
                    <th className="py-2.5 pr-3">Murid</th>
                    <th className="py-2.5 pr-3">Materi &amp; Bagian</th>
                    <th className="py-2.5 pr-3">Jenis</th>
                    <th className="py-2.5 pr-3">Nilai</th>
                    <th className="py-2.5 pr-3">Status</th>
                    <th className="py-2.5 pr-3">Catatan Guru</th>
                    {canEdit && <th className="py-2.5 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B7A2B]/10 text-sm">
                  {logs.map((log) => {
                    const st = state.students.find((s) => s.id === log.studentId);
                    return (
                      <tr key={log.id} className="hover:bg-[#F8FAF5]/70 align-top">
                        <td className="py-3 pr-3 whitespace-nowrap text-xs text-[#4A554A] tabular-nums">
                          <div className="font-semibold text-[#1A1D1A]">
                            Pekan {log.weekNumber} · {log.day}
                          </div>
                          <div>{log.date}</div>
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <AvatarThumb
                              name={st?.name || 'Murid'}
                              photoUrl={st?.photoUrl}
                              size="sm"
                            />
                            <div>
                              <p className="font-semibold text-[#1A1D1A] text-sm">
                                {st?.name || '-'}
                              </p>
                              <p className="text-xs text-[#4A554A]">{st?.classLevel}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <p className="font-semibold text-[#1A1D1A]">{log.materialTitle}</p>
                          <p className="text-xs text-[#4A554A]">
                            {log.category === 'JUZ_30' ? 'Juz 30' : 'Doa Harian'} ·{' '}
                            {log.portionDetail}
                          </p>
                        </td>
                        <td className="py-3 pr-3 text-xs text-[#4A554A] whitespace-nowrap">
                          {log.logType === 'SETORAN_BARU' ? 'Setoran Baru' : 'Murojaah'}
                        </td>
                        <td className="py-3 pr-3 font-mono-tabular font-bold text-[#1A1D1A]">
                          {log.score}
                        </td>
                        <td className="py-3 pr-3">
                          <StatusIndicator status={log.status} />
                        </td>
                        <td className="py-3 pr-3 text-xs text-[#404740] max-w-xs">
                          {log.notes || '-'}
                        </td>
                        {canEdit && (
                          <td className="py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditModal(log)}
                              className="p-1.5 rounded-lg text-[#1B7A2B] hover:bg-[#1B7A2B]/10"
                              aria-label="Edit catatan"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(log.id)}
                              className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10 ml-1"
                              aria-label="Hapus catatan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#1B7A2B]/10">
              {logs.map((log) => {
                const st = state.students.find((s) => s.id === log.studentId);
                return (
                  <div key={log.id} className="py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-[#1B7A2B] tabular-nums">
                          Pekan {log.weekNumber} · {log.day}, {log.date}
                        </p>
                        <p className="text-sm font-bold text-[#1A1D1A] mt-0.5">
                          {st?.name} ({st?.classLevel})
                        </p>
                      </div>
                      <span className="font-mono-tabular text-sm font-bold text-[#1A1D1A]">
                        Nilai: {log.score}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#1A1D1A]">
                      {log.materialTitle}{' '}
                      <span className="text-xs font-normal text-[#4A554A]">
                        ({log.portionDetail})
                      </span>
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <StatusIndicator status={log.status} />
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(log)}
                            className="p-1.5 text-[#1B7A2B]"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(log.id)}
                            className="p-1.5 text-[#DC2626]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    {log.notes && (
                      <p className="text-xs text-[#4A554A]">{log.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#1B7A2B]/20 w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#1B7A2B]/10">
              <h2 className="text-lg font-bold text-[#1A1D1A]">
                {editingLog ? 'Edit Catatan Harian' : 'Input Catatan Harian (Senin – Kamis)'}
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
              <div>
                <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                  Pilih Murid
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Pekan ke-
                  </label>
                  <select
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((wk) => (
                      <option key={wk} value={wk}>
                        Pekan {wk}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Hari
                  </label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value as DailyDay)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    {DAILY_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Jenis Materi
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as MaterialCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    <option value="JUZ_30">Al-Qur&apos;an Juz 30</option>
                    <option value="DOA_HARIAN">Doa &amp; Bacaan Harian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Jenis Kegiatan
                  </label>
                  <select
                    value={logType}
                    onChange={(e) =>
                      setLogType(e.target.value as 'SETORAN_BARU' | 'MUROJAAH')
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    <option value="SETORAN_BARU">Setoran Hafalan Baru</option>
                    <option value="MUROJAAH">Murojaah / Mengulang</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Pilih Surah / Doa
                  </label>
                  <select
                    value={materialId}
                    onChange={(e) => handleMaterialSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    {materialsByCat.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                    <option value="">-- Lainnya / Ketik Manual --</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Bagian / Ayat
                  </label>
                  <input
                    type="text"
                    value={portionDetail}
                    onChange={(e) => setPortionDetail(e.target.value)}
                    placeholder="Contoh: Ayat 1–10 atau Doa Lengkap"
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                    required
                  />
                </div>
              </div>

              {!materialId && (
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Nama Materi Manual
                  </label>
                  <input
                    type="text"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="Tulis nama surah atau doa"
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Nilai Setoran (0–100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setScore(val);
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
                    Status Kelancaran
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
                  Catatan Guru
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Makhraj sudah baik, pertahankan murojaah di rumah."
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
                  {saving ? 'Menyimpan...' : 'Simpan Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
