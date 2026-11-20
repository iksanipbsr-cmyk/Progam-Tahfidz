import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Volume2,
  Mic,
  Square,
  Upload,
  Link as LinkIcon,
  Search,
  X,
  ListOrdered,
} from 'lucide-react';
import { api, ClientAppState, fileToDataUrl } from '../lib/api';
import {
  ALL_CLASS_LEVELS,
  AuthSession,
  ClassLevel,
  Juz30SurahDetail,
  MaterialCategory,
  SemesterNumber,
  TahfidzMaterial,
} from '../types';

export function MaterialsView({
  session,
  state,
  selectedClass,
  selectedSemester,
  onStateChange,
}: {
  session: AuthSession;
  state: ClientAppState;
  selectedClass: ClassLevel | 'ALL';
  selectedSemester: SemesterNumber;
  onStateChange: (next: ClientAppState) => void;
}) {
  const isAdmin = session.role === 'ADMIN';
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | MaterialCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [respectGlobalFilter, setRespectGlobalFilter] = useState(false);

  // Modal state for Admin Add/Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<TahfidzMaterial | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formCategory, setFormCategory] = useState<MaterialCategory>('JUZ_30');
  const [formArabic, setFormArabic] = useState('');
  const [formGuide, setFormGuide] = useState('');
  const [formSemester, setFormSemester] = useState<SemesterNumber | 'BOTH'>('BOTH');
  const [formClasses, setFormClasses] = useState<ClassLevel[]>(['RA A', 'RA B']);
  const [formAudioUrl, setFormAudioUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Audio Recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // TTS fallback
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Juz 30 Full Text & Per-Ayah Reader state
  const [syncingJuz30, setSyncingJuz30] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerSurah, setReaderSurah] = useState<Juz30SurahDetail | null>(null);
  const [readerError, setReaderError] = useState<string | null>(null);

  async function handleSelectJuz30Tab() {
    setCategoryFilter('JUZ_30');
    const needsSync = state.materials.some(
      (m) =>
        m.category === 'JUZ_30' &&
        m.id.startsWith('mat-juz30-') &&
        !m.isCustom &&
        !m.arabicText.includes('﴿')
    );
    if (needsSync && !syncingJuz30) {
      setSyncingJuz30(true);
      try {
        const res = await api.syncJuz30();
        onStateChange(res.state);
      } catch {
        // ignore transient errors
      } finally {
        setSyncingJuz30(false);
      }
    }
  }

  async function openSurahReader(mat: TahfidzMaterial) {
    const surahStr = mat.id.replace('mat-juz30-', '');
    const surahNo = Number(surahStr);
    if (!Number.isInteger(surahNo)) return;
    setReaderOpen(true);
    setReaderLoading(true);
    setReaderError(null);
    setReaderSurah(null);
    try {
      const res = await api.getJuz30Surah(surahNo);
      setReaderSurah(res.surah);
    } catch (err) {
      setReaderError(err instanceof Error ? err.message : 'Gagal memuat surat.');
    } finally {
      setReaderLoading(false);
    }
  }

  function speakArabicText(mat: TahfidzMaterial) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (speakingId === mat.id) {
      setSpeakingId(null);
      return;
    }
    const utter = new SpeechSynthesisUtterance(mat.arabicText.replace(/۝/g, ' '));
    utter.lang = 'ar-SA';
    utter.rate = 0.82;
    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);
    setSpeakingId(mat.id);
    window.speechSynthesis.speak(utter);
  }

  function openAddModal() {
    setEditingMaterial(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormCategory('DOA_HARIAN');
    setFormArabic('');
    setFormGuide('');
    setFormSemester('BOTH');
    setFormClasses(selectedClass === 'ALL' ? ['RA A', 'RA B'] : [selectedClass]);
    setFormAudioUrl('');
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(mat: TahfidzMaterial) {
    setEditingMaterial(mat);
    setFormTitle(mat.title);
    setFormSubtitle(mat.subtitle || '');
    setFormCategory(mat.category);
    setFormArabic(mat.arabicText);
    setFormGuide(mat.translationOrGuide);
    setFormSemester(mat.targetSemester);
    setFormClasses(mat.targetClasses);
    setFormAudioUrl(mat.audioUrl || '');
    setFormError(null);
    setModalOpen(true);
  }

  function toggleTargetClass(cls: ClassLevel) {
    setFormClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  }

  async function handleAudioFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await api.uploadFile(dataUrl, file.name);
      setFormAudioUrl(res.url);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal mengunggah audio.');
    }
  }

  async function startRecording() {
    setFormError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const res = await api.uploadFile(
              String(reader.result),
              `rekaman-${Date.now()}.webm`
            );
            setFormAudioUrl(res.url);
          } catch (err) {
            setFormError(
              err instanceof Error ? err.message : 'Gagal menyimpan rekaman suara.'
            );
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSec(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSec((s) => s + 1);
      }, 1000);
    } catch {
      setFormError('Izin mikrofon ditolak atau perangkat tidak memiliki mikrofon.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  async function handleSaveMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formArabic.trim()) {
      setFormError('Judul materi dan teks Arab wajib diisi.');
      return;
    }
    if (formClasses.length === 0) {
      setFormError('Pilih minimal satu target jenjang/kelas.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || undefined,
        category: formCategory,
        arabicText: formArabic.trim(),
        translationOrGuide: formGuide.trim(),
        targetClasses: formClasses,
        targetSemester: formSemester,
        audioUrl: formAudioUrl.trim() || undefined,
        orderIndex: editingMaterial?.orderIndex ?? state.materials.length + 1,
      };

      if (editingMaterial) {
        const res = await api.updateMaterial(editingMaterial.id, payload);
        onStateChange(res.state);
      } else {
        const res = await api.createMaterial(payload);
        onStateChange(res.state);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan materi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMaterial(id: string) {
    try {
      const res = await api.deleteMaterial(id);
      onStateChange(res.state);
    } catch (err) {
      console.error(err);
    }
  }

  const filteredMaterials = state.materials
    .filter((mat) => {
      if (categoryFilter !== 'ALL' && mat.category !== categoryFilter) return false;
      if (respectGlobalFilter) {
        if (selectedClass !== 'ALL' && !mat.targetClasses.includes(selectedClass)) {
          return false;
        }
        if (mat.targetSemester !== 'BOTH' && mat.targetSemester !== selectedSemester) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          mat.title.toLowerCase().includes(q) ||
          (mat.subtitle || '').toLowerCase().includes(q) ||
          mat.translationOrGuide.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#1A1D1A]">
              Rangkuman Materi Tahfidz &amp; Doa Harian
            </h1>
            <p className="text-sm text-[#4A554A] mt-1">
              Teks Arab berharakat, panduan bacaan, target jenjang, dan pemutar audio murottal/doa.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Materi Manual</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="mt-5 pt-4 border-t border-[#1B7A2B]/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-[#F2F6EE] rounded-xl">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  categoryFilter === 'ALL'
                    ? 'bg-white text-[#1B7A2B] shadow-sm'
                    : 'text-[#4A554A] hover:text-[#1A1D1A]'
                }`}
              >
                Semua Materi ({state.materials.length})
              </button>
              <button
                type="button"
                onClick={handleSelectJuz30Tab}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  categoryFilter === 'JUZ_30'
                    ? 'bg-white text-[#1B7A2B] shadow-sm'
                    : 'text-[#4A554A] hover:text-[#1A1D1A]'
                }`}
              >
                {syncingJuz30 ? 'Memuat Juz 30...' : "Al-Qur'an Juz 30 (Teks & Audio)"}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('DOA_HARIAN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  categoryFilter === 'DOA_HARIAN'
                    ? 'bg-white text-[#1B7A2B] shadow-sm'
                    : 'text-[#4A554A] hover:text-[#1A1D1A]'
                }`}
              >
                Doa &amp; Bacaan Ibadah
              </button>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#4A554A] cursor-pointer px-2 py-1">
              <input
                type="checkbox"
                checked={respectGlobalFilter}
                onChange={(e) => setRespectGlobalFilter(e.target.checked)}
                className="rounded border-[#1B7A2B]/30 text-[#1B7A2B] focus:ring-[#1B7A2B]"
              />
              <span>
                Sesuai filter jenjang &amp; semester aktif (
                {selectedClass === 'ALL' ? 'Semua' : selectedClass} · Sem {selectedSemester})
              </span>
            </label>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-[#4A554A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari surah atau doa..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#1B7A2B]/20 bg-[#FCFBF5] text-sm focus:outline-none focus:border-[#1B7A2B]"
            />
          </div>
        </div>
      </div>

      {/* Material List */}
      {filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-10 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-[#1B7A2B]/35 mb-2" />
          <p className="text-sm font-semibold text-[#1A1D1A]">
            Tidak ada materi yang sesuai dengan filter.
          </p>
          <p className="text-xs text-[#4A554A] mt-1">
            Coba ubah kata kunci pencarian atau matikan filter target jenjang.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((mat) => (
            <article
              key={mat.id}
              className="bg-white rounded-2xl border border-[#1B7A2B]/15 p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[#1B7A2B]">
                      {mat.category === 'JUZ_30' ? "Al-Qur'an Juz 30" : 'Doa & Bacaan Ibadah'}
                      <span className="mx-1.5 text-[#4A554A]">·</span>
                      <span className="text-[#4A554A]">
                        {mat.targetSemester === 'BOTH'
                          ? 'Semester 1 & 2'
                          : `Semester ${mat.targetSemester}`}
                      </span>
                    </p>
                    <h2 className="text-lg font-bold text-[#1A1D1A] mt-0.5">
                      {mat.title}
                    </h2>
                    {mat.subtitle && (
                      <p className="text-xs text-[#4A554A] mt-0.5">{mat.subtitle}</p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(mat)}
                        aria-label={`Edit ${mat.title}`}
                        className="p-2 rounded-lg text-[#1B7A2B] hover:bg-[#1B7A2B]/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(mat.id)}
                        aria-label={`Hapus ${mat.title}`}
                        className="p-2 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Arabic Box */}
                <div className="mt-4 p-4 rounded-xl bg-[#FCFBF5] border border-[#E6C200]/35 max-h-64 overflow-y-auto">
                  <p className="font-arabic text-xl sm:text-2xl text-[#1A1D1A] text-right leading-loose whitespace-pre-line">
                    {mat.arabicText}
                  </p>
                </div>

                <p className="mt-3 text-xs text-[#4A554A] leading-relaxed">
                  {mat.translationOrGuide}
                </p>
              </div>

              {/* Footer: Target Classes, Per-Ayah Reader & Audio Player */}
              <div className="pt-3 border-t border-[#1B7A2B]/10 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-[#4A554A]">
                    <span className="font-semibold text-[#1A1D1A]">Target: </span>
                    {mat.targetClasses.join(', ')}
                  </p>
                  {mat.category === 'JUZ_30' && mat.id.startsWith('mat-juz30-') && (
                    <button
                      type="button"
                      onClick={() => openSurahReader(mat)}
                      className="text-xs font-semibold text-[#1B7A2B] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span>Baca Per Ayat &amp; Arti</span>
                    </button>
                  )}
                </div>

                {mat.audioUrl ? (
                  <div className="space-y-1">
                    <audio
                      controls
                      preload="none"
                      src={mat.audioUrl}
                      className="w-full h-9"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => speakArabicText(mat)}
                      className="px-3 py-1.5 rounded-lg border border-[#1B7A2B]/25 text-xs font-semibold text-[#1B7A2B] hover:bg-[#1B7A2B]/5 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>
                        {speakingId === mat.id
                          ? 'Hentikan Audio Bacaan'
                          : 'Putar Audio Panduan'}
                      </span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditModal(mat)}
                        className="text-[11px] font-semibold text-[#D97706] hover:underline"
                      >
                        + Unggah / Rekam Audio
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Admin Add / Edit Material Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#1B7A2B]/20 w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#1B7A2B]/10">
              <h2 className="text-lg font-bold text-[#1A1D1A]">
                {editingMaterial ? 'Edit Materi Tahfidz' : 'Tambah Materi Tahfidz Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F2F6EE] text-[#4A554A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Kategori Materi
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MaterialCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    <option value="JUZ_30">Al-Qur&apos;an Juz 30</option>
                    <option value="DOA_HARIAN">Doa &amp; Bacaan Harian / Ibadah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Target Semester
                  </label>
                  <select
                    value={String(formSemester)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormSemester(v === 'BOTH' ? 'BOTH' : (Number(v) as SemesterNumber));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  >
                    <option value="BOTH">Semester 1 &amp; Semester 2</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Judul Surah / Doa
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: Doa Masuk Masjid"
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                    Subjudul / Keterangan Ringkas
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="Contoh: Doa Ibadah Harian"
                    className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                  Teks Arab Berharakat
                </label>
                <textarea
                  rows={3}
                  dir="rtl"
                  value={formArabic}
                  onChange={(e) => setFormArabic(e.target.value)}
                  placeholder="Tulis teks Arab berharakat lengkap..."
                  className="w-full px-3 py-2.5 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] font-arabic text-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1D1A] mb-1">
                  Arti &amp; Catatan Panduan Guru
                </label>
                <textarea
                  rows={2}
                  value={formGuide}
                  onChange={(e) => setFormGuide(e.target.value)}
                  placeholder="Tuliskan arti doa atau catatan pembagian hafalan per pekan..."
                  className="w-full px-3 py-2 rounded-xl border border-[#1B7A2B]/25 bg-[#FCFBF5] text-sm"
                />
              </div>

              {/* Target Classes */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1D1A] mb-1.5">
                  Target Jenjang &amp; Kelas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CLASS_LEVELS.map((cls) => {
                    const active = formClasses.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => toggleTargetClass(cls)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-[#1B7A2B] text-white border-[#1B7A2B]'
                            : 'bg-white text-[#4A554A] border-[#1B7A2B]/20 hover:border-[#1B7A2B]'
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audio Upload / Link / Voice Recorder */}
              <div className="p-4 rounded-xl bg-[#F8FAF5] border border-[#1B7A2B]/15 space-y-3">
                <p className="text-xs font-bold text-[#1A1D1A]">
                  Audio Materi (Unggah File, Tautan URL, atau Rekam Suara)
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-2 rounded-lg bg-white border border-[#1B7A2B]/25 text-xs font-semibold text-[#1B7A2B] hover:bg-[#1B7A2B]/5 cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah File Audio</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileUpload}
                      className="hidden"
                    />
                  </label>

                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-3 py-2 rounded-lg bg-white border border-[#1B7A2B]/25 text-xs font-semibold text-[#1A1D1A] hover:border-[#1B7A2B] inline-flex items-center gap-1.5"
                    >
                      <Mic className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>Rekam Suara Langsung</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-3 py-2 rounded-lg bg-[#DC2626] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Hentikan Rekaman ({recordingSec}s)</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 text-[#4A554A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formAudioUrl}
                    onChange={(e) => setFormAudioUrl(e.target.value)}
                    placeholder="Atau tempel tautan audio (https://... atau /uploads/...)"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#1B7A2B]/20 bg-white text-xs"
                  />
                </div>

                {formAudioUrl && (
                  <div className="pt-1 space-y-1.5">
                    <audio controls src={formAudioUrl} className="w-full h-9" />
                    <button
                      type="button"
                      onClick={() => setFormAudioUrl('')}
                      className="text-[11px] font-semibold text-[#DC2626] hover:underline"
                    >
                      Hapus Audio Ini
                    </button>
                  </div>
                )}
              </div>

              {formError && (
                <p className="text-xs font-medium text-[#DC2626]">{formError}</p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#1B7A2B]/20 text-sm font-semibold text-[#4A554A] hover:bg-[#F8FAF5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#1B7A2B] hover:bg-[#238A35] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Materi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Per-Ayah Surah Reader Modal */}
      {readerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#1B7A2B]/20 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#1B7A2B]/10 flex items-center justify-between gap-4 bg-[#FCFBF5]">
              <div>
                <h2 className="text-lg font-bold text-[#1A1D1A]">
                  {readerSurah
                    ? `QS. ${readerSurah.latinName} (${readerSurah.arabicName})`
                    : 'Memuat Teks Surat...'}
                </h2>
                {readerSurah && (
                  <p className="text-xs text-[#4A554A] mt-0.5">
                    Surah ke-{readerSurah.surahNo} · {readerSurah.ayahCount} Ayat · Arti:{' '}
                    {readerSurah.meaning}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReaderOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F2F6EE] text-[#4A554A]"
                aria-label="Tutup pembaca surat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {readerLoading && (
                <p className="text-center py-10 text-sm text-[#4A554A]">
                  Memuat ayat lengkap Al-Qur&apos;an...
                </p>
              )}

              {readerError && (
                <p className="text-center py-8 text-sm text-[#DC2626] font-medium">
                  {readerError}
                </p>
              )}

              {readerSurah && (
                <>
                  <div className="p-4 rounded-xl bg-[#FCFBF5] border border-[#E6C200]/35 text-center">
                    <p className="font-arabic text-2xl text-[#1A1D1A]">
                      بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                    </p>
                  </div>

                  <div className="divide-y divide-[#1B7A2B]/10">
                    {readerSurah.ayahs.map((ayah) => (
                      <div key={ayah.number} className="py-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#1B7A2B]/10 text-[#1B7A2B] text-xs font-bold font-mono-tabular shrink-0 mt-1">
                            {ayah.number}
                          </span>
                          <p className="font-arabic text-2xl sm:text-3xl text-[#1A1D1A] text-right leading-loose flex-1">
                            {ayah.arabic}
                          </p>
                        </div>

                        {ayah.indonesian && (
                          <p className="text-xs text-[#4A554A] leading-relaxed pl-10">
                            {ayah.indonesian}
                          </p>
                        )}

                        {ayah.audioUrl && (
                          <div className="pl-10 pt-1">
                            <audio
                              controls
                              preload="none"
                              src={ayah.audioUrl}
                              className="w-full max-w-sm h-8"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
