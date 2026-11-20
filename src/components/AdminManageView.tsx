import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  Calendar,
  KeyRound,
  Pencil,
  Trash2,
  Upload,
  X,
  Check,
} from 'lucide-react';
import { api, ClientAppState, fileToDataUrl } from '../lib/api';
import {
  ALL_CLASS_LEVELS,
  ClassLevel,
  InstitutionType,
  SemesterNumber,
  StudentProfile,
  TeacherProfile,
} from '../types';
import { AvatarThumb } from './SharedUI';

type AdminTab = 'TEACHERS' | 'STUDENTS' | 'YEARS' | 'SECURITY';

export function AdminManageView({
  state,
  onStateChange,
}: {
  state: ClientAppState;
  onStateChange: (next: ClientAppState) => void;
}) {
  const [tab, setTab] = useState<AdminTab>('TEACHERS');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Teacher Modal
  const [teacherModal, setTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);
  const [tName, setTName] = useState('');
  const [tLoginId, setTLoginId] = useState('');
  const [tRole, setTRole] = useState<'KEPALA_PROGRAM' | 'GURU_PENDAMPING'>('GURU_PENDAMPING');
  const [tNip, setTNip] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tClasses, setTClasses] = useState<ClassLevel[]>(['RA A']);
  const [tPhoto, setTPhoto] = useState('');

  // Student Modal
  const [studentModal, setStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [sName, setSName] = useState('');
  const [sNis, setSNis] = useState('');
  const [sParentName, setSParentName] = useState('');
  const [sStudentLoginId, setSStudentLoginId] = useState('');
  const [sParentLoginId, setSParentLoginId] = useState('');
  const [sClass, setSClass] = useState<ClassLevel>('RA A');
  const [sRombel, setSRombel] = useState('');
  const [sYearId, setSYearId] = useState(
    state.academicYears.find((y) => y.isActive)?.id || state.academicYears[0]?.id || ''
  );
  const [sPhoto, setSPhoto] = useState('');

  // Academic Year Form
  const [newYearLabel, setNewYearLabel] = useState('');
  const [newYearSem, setNewYearSem] = useState<SemesterNumber>(1);

  // Admin Password Form
  const [adminName, setAdminName] = useState(state.adminProfile.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function notify(msg: string) {
    setErrorMsg(null);
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  }

  async function handlePhotoUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await api.uploadFile(dataUrl, file.name);
      setter(res.url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengunggah foto.');
    }
  }

  // Teacher handlers
  function openTeacherModal(tch?: TeacherProfile) {
    if (tch) {
      setEditingTeacher(tch);
      setTName(tch.name);
      setTLoginId(tch.loginId);
      setTRole(tch.role);
      setTNip(tch.nipOrNuptk || '');
      setTPhone(tch.phone || '');
      setTClasses(tch.assignedClasses);
      setTPhoto(tch.photoUrl || '');
    } else {
      setEditingTeacher(null);
      setTName('');
      setTLoginId(`GRU-${Date.now().toString().slice(-4)}`);
      setTRole('GURU_PENDAMPING');
      setTNip('');
      setTPhone('');
      setTClasses(['RA A']);
      setTPhoto('');
    }
    setErrorMsg(null);
    setTeacherModal(true);
  }

  async function saveTeacher(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const payload = {
        name: tName.trim(),
        loginId: tLoginId.trim().toUpperCase(),
        role: tRole,
        nipOrNuptk: tNip.trim() || undefined,
        phone: tPhone.trim() || undefined,
        assignedClasses: tRole === 'KEPALA_PROGRAM' ? ALL_CLASS_LEVELS : tClasses,
        photoUrl: tPhoto || undefined,
      };
      if (editingTeacher) {
        const res = await api.updateTeacher(editingTeacher.id, payload);
        onStateChange(res.state);
        notify('Data guru berhasil diperbarui.');
      } else {
        const res = await api.createTeacher(payload);
        onStateChange(res.state);
        notify('Guru baru berhasil ditambahkan.');
      }
      setTeacherModal(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan data guru.');
    }
  }

  async function deleteTeacher(id: string) {
    const res = await api.deleteTeacher(id);
    onStateChange(res.state);
    notify('Data guru dihapus.');
  }

  // Student handlers
  function openStudentModal(st?: StudentProfile) {
    if (st) {
      setEditingStudent(st);
      setSName(st.name);
      setSNis(st.nis || '');
      setSParentName(st.parentName);
      setSStudentLoginId(st.studentLoginId);
      setSParentLoginId(st.parentLoginId);
      setSClass(st.classLevel);
      setSRombel(st.rombel || '');
      setSYearId(st.academicYearId);
      setSPhoto(st.photoUrl || '');
    } else {
      const code = Date.now().toString().slice(-4);
      setEditingStudent(null);
      setSName('');
      setSNis('');
      setSParentName('');
      setSStudentLoginId(`MRD-${code}`);
      setSParentLoginId(`ORT-${code}`);
      setSClass('RA A');
      setSRombel('A');
      setSYearId(
        state.academicYears.find((y) => y.isActive)?.id || state.academicYears[0]?.id || ''
      );
      setSPhoto('');
    }
    setErrorMsg(null);
    setStudentModal(true);
  }

  async function saveStudent(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const institution: InstitutionType = sClass.startsWith('RA') ? 'RA' : 'MI';
    try {
      const payload = {
        name: sName.trim(),
        nis: sNis.trim() || undefined,
        parentName: sParentName.trim(),
        studentLoginId: sStudentLoginId.trim().toUpperCase(),
        parentLoginId: sParentLoginId.trim().toUpperCase(),
        institution,
        classLevel: sClass,
        rombel: sRombel.trim() || undefined,
        academicYearId: sYearId,
        photoUrl: sPhoto || undefined,
      };
      if (editingStudent) {
        const res = await api.updateStudent(editingStudent.id, payload);
        onStateChange(res.state);
        notify('Data murid berhasil diperbarui.');
      } else {
        const res = await api.createStudent(payload);
        onStateChange(res.state);
        notify('Murid baru berhasil ditambahkan beserta ID Login Murid & Orang Tua.');
      }
      setStudentModal(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan data murid.');
    }
  }

  async function deleteStudent(id: string) {
    const res = await api.deleteStudent(id);
    onStateChange(res.state);
    notify('Data murid berhasil dihapus.');
  }

  // Academic Year handlers
  async function handleAddYear(e: React.FormEvent) {
    e.preventDefault();
    if (!newYearLabel.trim()) return;
    const res = await api.createAcademicYear({
      label: newYearLabel.trim(),
      activeSemester: newYearSem,
      isActive: true,
    });
    onStateChange(res.state);
    setNewYearLabel('');
    notify('Tahun ajaran baru ditambahkan dan diaktifkan.');
  }

  async function handleActivateYear(id: string, activeSemester: SemesterNumber) {
    const res = await api.updateAcademicYear(id, { isActive: true, activeSemester });
    onStateChange(res.state);
    notify('Tahun ajaran & semester aktif diperbarui.');
  }

  // Security / Password handler
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    try {
      const res = await api.updateAdminAccount({
        newName: adminName.trim(),
        currentPassword: newPassword ? currentPassword : undefined,
        newPassword: newPassword || undefined,
      });
      onStateChange(res.state);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('Pengaturan akun & kata sandi Admin berhasil diperbarui.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui kata sandi.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
        <h1 className="text-xl font-bold text-[#1A1D1A]">
          Pengaturan Madrasah, Akun Pengguna &amp; Keamanan Admin
        </h1>
        <p className="text-sm text-[#4A554A] mt-1">
          Kelola profil &amp; foto Guru/Murid, buat ID Login khusus Guru, Murid &amp; Orang Tua, atur Tahun Ajaran, serta ganti kata sandi Admin.
        </p>

        <div className="mt-5 flex flex-wrap gap-1.5 p-1 bg-[#F2F6EE] rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setTab('TEACHERS')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${
              tab === 'TEACHERS'
                ? 'bg-white text-[#1B7A2B] shadow-sm'
                : 'text-[#4A554A] hover:text-[#1A1D1A]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Guru &amp; Kepsek ({state.teachers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('STUDENTS')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${
              tab === 'STUDENTS'
                ? 'bg-white text-[#1B7A2B] shadow-sm'
                : 'text-[#4A554A] hover:text-[#1A1D1A]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Murid &amp; Orang Tua ({state.students.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('YEARS')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${
              tab === 'YEARS'
                ? 'bg-white text-[#1B7A2B] shadow-sm'
                : 'text-[#4A554A] hover:text-[#1A1D1A]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Tahun Ajaran</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('SECURITY')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${
              tab === 'SECURITY'
                ? 'bg-white text-[#1B7A2B] shadow-sm'
                : 'text-[#4A554A] hover:text-[#1A1D1A]'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Kata Sandi Admin</span>
          </button>
        </div>

        {feedback && (
          <div className="mt-4 p-3 rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/25 text-xs sm:text-sm font-semibold text-[#16A34A] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Tab 1: Teachers */}
      {tab === 'TEACHERS' && (
        <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-[#1A1D1A]">
              Daftar Guru Pendamping &amp; Ketua Program
            </h2>
            <button
              type="button"
              onClick={() => openTeacherModal()}
              className="px-4 py-2 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Guru</span>
            </button>
          </div>

          <div className="divide-y divide-[#1B7A2B]/10">
            {state.teachers.map((tch) => (
              <div
                key={tch.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <AvatarThumb name={tch.name} photoUrl={tch.photoUrl} size="lg" />
                  <div>
                    <p className="text-xs font-semibold text-[#1B7A2B]">
                      {tch.role === 'KEPALA_PROGRAM'
                        ? 'Ketua Program / Kepala Sekolah (Semua Jenjang)'
                        : 'Guru Pendamping / Wali Kelas'}
                      {' · '}
                      <span className="font-mono-tabular">ID Login: {tch.loginId}</span>
                    </p>
                    <h3 className="text-sm sm:text-base font-bold text-[#1A1D1A]">
                      {tch.name}
                    </h3>
                    <p className="text-xs text-[#4A554A]">
                      Penugasan: {tch.assignedClasses.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => openTeacherModal(tch)}
                    className="px-3 py-1.5 rounded-lg border border-[#1B7A2B]/20 text-xs font-semibold text-[#1B7A2B] hover:bg-[#1B7A2B]/5 inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit &amp; Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTeacher(tch.id)}
                    className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10"
                    aria-label="Hapus guru"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Students */}
      {tab === 'STUDENTS' && (
        <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-[#1A1D1A]">
              Daftar Murid &amp; ID Login Murid / Orang Tua
            </h2>
            <button
              type="button"
              onClick={() => openStudentModal()}
              className="px-4 py-2 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Murid</span>
            </button>
          </div>

          <div className="divide-y divide-[#1B7A2B]/10">
            {state.students.map((st) => (
              <div
                key={st.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <AvatarThumb name={st.name} photoUrl={st.photoUrl} size="lg" />
                  <div>
                    <p className="text-xs font-semibold text-[#1B7A2B]">
                      {st.institution} · {st.classLevel}
                      {st.rombel ? ` (${st.rombel})` : ''} · Wali: {st.parentName}
                    </p>
                    <h3 className="text-sm sm:text-base font-bold text-[#1A1D1A]">
                      {st.name}
                    </h3>
                    <p className="text-xs text-[#4A554A] font-mono-tabular">
                      ID Murid: <strong>{st.studentLoginId}</strong> · ID Orang Tua:{' '}
                      <strong>{st.parentLoginId}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => openStudentModal(st)}
                    className="px-3 py-1.5 rounded-lg border border-[#1B7A2B]/20 text-xs font-semibold text-[#1B7A2B] hover:bg-[#1B7A2B]/5 inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit &amp; Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStudent(st.id)}
                    className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10"
                    aria-label="Hapus murid"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Academic Years */}
      {tab === 'YEARS' && (
        <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6 space-y-5">
          <form onSubmit={handleAddYear} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                Tambah Tahun Ajaran Baru
              </label>
              <input
                type="text"
                value={newYearLabel}
                onChange={(e) => setNewYearLabel(e.target.value)}
                placeholder="Contoh: 2026/2027"
                className="px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm font-mono-tabular"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                Semester Awal
              </label>
              <select
                value={newYearSem}
                onChange={(e) => setNewYearSem(Number(e.target.value) as SemesterNumber)}
                className="px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
              >
                <option value={1}>Semester 1 (Ganjil)</option>
                <option value={2}>Semester 2 (Genap)</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#1B7A2B] text-white text-sm font-semibold"
            >
              Simpan &amp; Aktifkan
            </button>
          </form>

          <div className="divide-y divide-[#1B7A2B]/10">
            {state.academicYears.map((ay) => (
              <div
                key={ay.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-[#1A1D1A] font-mono-tabular">
                    Tahun Ajaran {ay.label}
                  </p>
                  <p className="text-xs text-[#4A554A]">
                    Semester aktif: Semester {ay.activeSemester}
                    {ay.isActive ? ' · Sedang Aktif' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleActivateYear(ay.id, 1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      ay.isActive && ay.activeSemester === 1
                        ? 'bg-[#1B7A2B] text-white border-[#1B7A2B]'
                        : 'border-[#1B7A2B]/25 text-[#1B7A2B]'
                    }`}
                  >
                    Aktifkan Sem 1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleActivateYear(ay.id, 2)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      ay.isActive && ay.activeSemester === 2
                        ? 'bg-[#1B7A2B] text-white border-[#1B7A2B]'
                        : 'border-[#1B7A2B]/25 text-[#1B7A2B]'
                    }`}
                  >
                    Aktifkan Sem 2
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Security / Admin Password */}
      {tab === 'SECURITY' && (
        <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6 max-w-xl">
          <h2 className="text-base font-bold text-[#1A1D1A] mb-1">
            Pengaturan Keamanan &amp; Ganti Kata Sandi Admin
          </h2>
          <p className="text-xs text-[#4A554A] mb-5">
            ID Admin saat ini: <strong className="font-mono-tabular">{state.adminProfile.loginId}</strong>
          </p>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                Nama Tampilan Admin Madrasah
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                required
              />
            </div>

            <div className="pt-2 border-t border-[#1B7A2B]/10 space-y-3">
              <p className="text-xs font-bold text-[#1A1D1A]">
                Ganti Kata Sandi Akun Admin
              </p>
              <div>
                <label className="block text-xs font-semibold text-[#4A554A] mb-1">
                  Kata Sandi Saat Ini
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama"
                  className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A554A] mb-1">
                  Kata Sandi Baru (minimal 5 karakter)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A554A] mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-[#DC2626]">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-sm font-semibold"
            >
              Simpan Perubahan Keamanan
            </button>
          </form>
        </div>
      )}

      {/* Teacher Modal */}
      {teacherModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#1B7A2B]/20 w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#1B7A2B]/10">
              <h2 className="text-lg font-bold text-[#1A1D1A]">
                {editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setTeacherModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F2F6EE]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveTeacher} className="mt-4 space-y-4">
              {/* Photo upload slot */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-[#F8FAF5] border border-[#1B7A2B]/15">
                <AvatarThumb name={tName || 'Guru'} photoUrl={tPhoto} size="xl" />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#1A1D1A]">
                    Foto Profil Guru (JPG / PNG)
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#1B7A2B]/25 text-xs font-semibold text-[#1B7A2B] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Foto Profil</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, setTPhoto)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                  Nama Lengkap &amp; Gelar Guru
                </label>
                <input
                  type="text"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="Contoh: Ustadzah Siti Aminah, S.Pd"
                  className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    ID Login Khusus Guru
                  </label>
                  <input
                    type="text"
                    value={tLoginId}
                    onChange={(e) => setTLoginId(e.target.value)}
                    placeholder="Contoh: GRU-RAA"
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm font-mono-tabular"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Peran / Jabatan
                  </label>
                  <select
                    value={tRole}
                    onChange={(e) =>
                      setTRole(e.target.value as 'KEPALA_PROGRAM' | 'GURU_PENDAMPING')
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    <option value="GURU_PENDAMPING">Guru Pendamping / Wali Kelas</option>
                    <option value="KEPALA_PROGRAM">Ketua Program / Kepala Sekolah</option>
                  </select>
                </div>
              </div>

              {tRole === 'GURU_PENDAMPING' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1.5">
                    Jenjang / Kelas Penugasan
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_CLASS_LEVELS.map((cls) => {
                      const active = tClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() =>
                            setTClasses((prev) =>
                              prev.includes(cls)
                                ? prev.filter((c) => c !== cls)
                                : [...prev, cls]
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            active
                              ? 'bg-[#1B7A2B] text-white border-[#1B7A2B]'
                              : 'bg-white text-[#4A554A] border-[#1B7A2B]/20'
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs font-semibold text-[#DC2626]">{errorMsg}</p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTeacherModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#1B7A2B]/20 text-sm font-semibold text-[#4A554A]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1B7A2B] text-white text-sm font-semibold"
                >
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Modal */}
      {studentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#1B7A2B]/20 w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#1B7A2B]/10">
              <h2 className="text-lg font-bold text-[#1A1D1A]">
                {editingStudent ? 'Edit Profil Murid' : 'Tambah Murid Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setStudentModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F2F6EE]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveStudent} className="mt-4 space-y-4">
              {/* Photo upload slot */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-[#F8FAF5] border border-[#1B7A2B]/15">
                <AvatarThumb name={sName || 'Murid'} photoUrl={sPhoto} size="xl" />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#1A1D1A]">
                    Foto Profil Murid (JPG / PNG)
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#1B7A2B]/25 text-xs font-semibold text-[#1B7A2B] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Foto Murid</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, setSPhoto)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Nama Lengkap Murid
                  </label>
                  <input
                    type="text"
                    value={sName}
                    onChange={(e) => setSName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Nama Orang Tua / Wali
                  </label>
                  <input
                    type="text"
                    value={sParentName}
                    onChange={(e) => setSParentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Jenjang / Kelas
                  </label>
                  <select
                    value={sClass}
                    onChange={(e) => setSClass(e.target.value as ClassLevel)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    {ALL_CLASS_LEVELS.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Rombel
                  </label>
                  <input
                    type="text"
                    value={sRombel}
                    onChange={(e) => setSRombel(e.target.value)}
                    placeholder="1A / Unggulan"
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    NIS
                  </label>
                  <input
                    type="text"
                    value={sNis}
                    onChange={(e) => setSNis(e.target.value)}
                    placeholder="Opsional"
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    ID Login Khusus Murid
                  </label>
                  <input
                    type="text"
                    value={sStudentLoginId}
                    onChange={(e) => setSStudentLoginId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm font-mono-tabular"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    ID Login Khusus Orang Tua
                  </label>
                  <input
                    type="text"
                    value={sParentLoginId}
                    onChange={(e) => setSParentLoginId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm font-mono-tabular"
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs font-semibold text-[#DC2626]">{errorMsg}</p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStudentModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#1B7A2B]/20 text-sm font-semibold text-[#4A554A]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1B7A2B] text-white text-sm font-semibold"
                >
                  Simpan Murid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
