import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createSeedDatabase } from './src/data/seedDatabase';
import {
  AcademicYear,
  ALL_PREDICATES,
  AppDatabase,
  AuthSession,
  DailyLog,
  getPredicateFromScore,
  Juz30SurahDetail,
  MonthlyEvaluation,
  StudentProfile,
  TahfidzMaterial,
  TeacherProfile,
  WeeklyEvaluation,
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOAD_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');
const JUZ30_CACHE_FILE = path.resolve(DATA_DIR, 'juz30_cache.json');

function toArabicDigits(num: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map((d) => digits[Number(d)] ?? d)
    .join('');
}

function readJuz30Cache(): Record<string, Juz30SurahDetail> {
  try {
    if (fs.existsSync(JUZ30_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(JUZ30_CACHE_FILE, 'utf-8')) as Record<
        string,
        Juz30SurahDetail
      >;
    }
  } catch {
    // ignore corrupted cache
  }
  return {};
}

function writeJuz30Cache(cache: Record<string, Juz30SurahDetail>): void {
  ensureStorage();
  fs.writeFileSync(JUZ30_CACHE_FILE, JSON.stringify(cache), 'utf-8');
}

async function fetchSurahFromUpstream(surahNo: number): Promise<Juz30SurahDetail | null> {
  try {
    const res = await fetch(`https://equran.id/api/v2/surat/${surahNo}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: {
          nomor: number;
          nama: string;
          namaLatin: string;
          arti: string;
          jumlahAyat: number;
          ayat: {
            nomorAyat: number;
            teksArab: string;
            teksLatin: string;
            teksIndonesia: string;
            audio?: Record<string, string>;
          }[];
        };
      };
      if (json.data && Array.isArray(json.data.ayat)) {
        const ayahs = json.data.ayat.map((a) => ({
          number: a.nomorAyat,
          arabic: a.teksArab,
          latin: a.teksLatin,
          indonesian: a.teksIndonesia,
          audioUrl: a.audio?.['05'] || a.audio?.['01'],
        }));
        const joinedArabic = ayahs
          .map((a) => `${a.arabic} ﴿${toArabicDigits(a.number)}﴾`)
          .join(' ');
        const fullArabicText = `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ\n${joinedArabic}`;
        const fullTransliteration = ayahs
          .map((a) => `${a.number}. ${a.latin}`)
          .join(' ');
        return {
          surahNo: json.data.nomor,
          arabicName: json.data.nama,
          latinName: json.data.namaLatin,
          meaning: json.data.arti,
          ayahCount: json.data.jumlahAyat,
          fullArabicText,
          fullTransliteration,
          ayahs,
        };
      }
    }
  } catch {
    // fallback below
  }

  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNo}/quran-uthmani`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const json = (await res.json()) as {
        data?: {
          number: number;
          name: string;
          englishName: string;
          englishNameTranslation: string;
          numberOfAyahs: number;
          ayahs: { numberInSurah: number; text: string }[];
        };
      };
      if (json.data && Array.isArray(json.data.ayahs)) {
        const ayahs = json.data.ayahs.map((a) => ({
          number: a.numberInSurah,
          arabic: a.text,
          latin: '',
          indonesian: '',
        }));
        const joinedArabic = ayahs
          .map((a) => `${a.arabic} ﴿${toArabicDigits(a.number)}﴾`)
          .join(' ');
        return {
          surahNo: json.data.number,
          arabicName: json.data.name,
          latinName: json.data.englishName,
          meaning: json.data.englishNameTranslation,
          ayahCount: json.data.numberOfAyahs,
          fullArabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ\n${joinedArabic}`,
          fullTransliteration: '',
          ayahs,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function getOrFetchSurah(surahNo: number): Promise<Juz30SurahDetail | null> {
  const cache = readJuz30Cache();
  if (cache[String(surahNo)]) {
    return cache[String(surahNo)];
  }
  const fetched = await fetchSurahFromUpstream(surahNo);
  if (fetched) {
    cache[String(surahNo)] = fetched;
    writeJuz30Cache(cache);
  }
  return fetched;
}

async function syncAllJuz30IntoDb(): Promise<void> {
  const cache = readJuz30Cache();
  const missing: number[] = [];
  for (let s = 78; s <= 114; s++) {
    if (!cache[String(s)]) missing.push(s);
  }
  // Fetch missing surahs in parallel batches of 8
  for (let i = 0; i < missing.length; i += 8) {
    const batch = missing.slice(i, i + 8);
    const results = await Promise.all(batch.map((n) => fetchSurahFromUpstream(n)));
    results.forEach((detail) => {
      if (detail) {
        cache[String(detail.surahNo)] = detail;
      }
    });
  }
  if (missing.length > 0) {
    writeJuz30Cache(cache);
  }

  const db = readDb();
  let dbChanged = false;
  db.materials = db.materials.map((m) => {
    if (m.category === 'JUZ_30' && m.id.startsWith('mat-juz30-') && !m.isCustom) {
      const surahNo = m.id.replace('mat-juz30-', '');
      const detail = cache[surahNo];
      if (detail && !m.arabicText.includes('﴿')) {
        dbChanged = true;
        return {
          ...m,
          arabicText: detail.fullArabicText,
          transliteration: detail.fullTransliteration || m.transliteration,
          audioUrl:
            m.audioUrl ||
            `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahNo}.mp3`,
        };
      }
    }
    return m;
  });
  if (dbChanged) {
    writeDb(db);
  }
}

function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
  }
}

function readDb(): AppDatabase {
  ensureStorage();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(raw) as AppDatabase;
    let updated = false;
    db.materials = db.materials.map((m) => {
      if (m.category === 'JUZ_30' && !m.audioUrl && m.id.startsWith('mat-juz30-')) {
        const surahNo = m.id.replace('mat-juz30-', '');
        if (/^\d+$/.test(surahNo)) {
          updated = true;
          return {
            ...m,
            audioUrl: `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahNo}.mp3`,
          };
        }
      }
      return m;
    });
    db.monthlyEvaluations = (db.monthlyEvaluations || []).map((ev) => {
      if (!ALL_PREDICATES.includes(ev.predicate)) {
        updated = true;
        return {
          ...ev,
          predicate: getPredicateFromScore(ev.averageScore),
        };
      }
      return ev;
    });
    if (updated) {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    }
    return db;
  } catch {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function writeDb(db: AppDatabase): void {
  ensureStorage();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function sanitizeDb(db: AppDatabase) {
  return {
    adminProfile: {
      loginId: db.admin.loginId,
      name: db.admin.name,
      photoUrl: db.admin.photoUrl,
    },
    academicYears: db.academicYears,
    teachers: db.teachers,
    students: db.students,
    materials: db.materials,
    dailyLogs: db.dailyLogs,
    weeklyEvaluations: db.weeklyEvaluations,
    monthlyEvaluations: db.monthlyEvaluations,
  };
}

async function startServer() {
  ensureStorage();
  const initialSyncPromise = syncAllJuz30IntoDb().catch((err) => {
    console.error('Juz 30 sync warning:', err);
  });

  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/state', async (_req, res) => {
    await Promise.race([
      initialSyncPromise,
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
    const db = readDb();
    res.json(sanitizeDb(db));
  });

  app.get('/api/juz30/:surahNo', async (req, res) => {
    const surahNo = Number(req.params.surahNo);
    if (!Number.isInteger(surahNo) || surahNo < 78 || surahNo > 114) {
      res.status(400).json({ error: 'Nomor surah Juz 30 harus antara 78 hingga 114.' });
      return;
    }
    const surah = await getOrFetchSurah(surahNo);
    if (!surah) {
      res.status(502).json({ error: 'Gagal memuat teks surat dari sumber Al-Qur’an.' });
      return;
    }
    res.json({ surah });
  });

  app.post('/api/juz30/sync', async (_req, res) => {
    await syncAllJuz30IntoDb();
    const db = readDb();
    res.json({ state: sanitizeDb(db) });
  });

  app.post('/api/login', (req, res) => {
    const { mode, loginId, password } = req.body as {
      mode: 'ADMIN' | 'TEACHER' | 'FAMILY';
      loginId: string;
      password?: string;
    };

    const cleanId = (loginId || '').trim().toUpperCase();
    if (!cleanId) {
      res.status(400).json({ error: 'ID Login wajib diisi.' });
      return;
    }

    const db = readDb();

    if (mode === 'ADMIN') {
      if (cleanId !== db.admin.loginId.toUpperCase()) {
        res.status(401).json({ error: 'ID Admin tidak ditemukan.' });
        return;
      }
      if ((password || '') !== db.admin.password) {
        res.status(401).json({ error: 'Kata sandi Admin tidak sesuai.' });
        return;
      }
      const session: AuthSession = {
        role: 'ADMIN',
        loginId: db.admin.loginId,
        displayName: db.admin.name,
        photoUrl: db.admin.photoUrl,
      };
      res.json({ session });
      return;
    }

    if (mode === 'TEACHER') {
      const teacher = db.teachers.find((t) => t.loginId.toUpperCase() === cleanId);
      if (!teacher) {
        res.status(401).json({
          error: 'ID Guru atau Ketua Program tidak ditemukan. Hubungi Admin Madrasah.',
        });
        return;
      }
      const session: AuthSession = {
        role: teacher.role,
        loginId: teacher.loginId,
        displayName: teacher.name,
        photoUrl: teacher.photoUrl,
        teacher,
      };
      res.json({ session });
      return;
    }

    if (mode === 'FAMILY') {
      const asStudent = db.students.find(
        (s) => s.studentLoginId.toUpperCase() === cleanId
      );
      if (asStudent) {
        const session: AuthSession = {
          role: 'MURID',
          loginId: asStudent.studentLoginId,
          displayName: asStudent.name,
          photoUrl: asStudent.photoUrl,
          student: asStudent,
        };
        res.json({ session });
        return;
      }

      const asParent = db.students.find(
        (s) => s.parentLoginId.toUpperCase() === cleanId
      );
      if (asParent) {
        const session: AuthSession = {
          role: 'ORANG_TUA',
          loginId: asParent.parentLoginId,
          displayName: `${asParent.parentName} (Wali ${asParent.name})`,
          photoUrl: asParent.photoUrl,
          student: asParent,
        };
        res.json({ session });
        return;
      }

      res.status(401).json({
        error: 'ID Murid / Orang Tua tidak terdaftar. Periksa kembali ID dari Admin Madrasah.',
      });
      return;
    }

    res.status(400).json({ error: 'Mode login tidak valid.' });
  });

  app.post('/api/admin/password', (req, res) => {
    const { currentPassword, newPassword, newName, photoUrl } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      newName?: string;
      photoUrl?: string;
    };
    const db = readDb();

    if (newPassword !== undefined) {
      if ((currentPassword || '') !== db.admin.password) {
        res.status(400).json({ error: 'Kata sandi saat ini tidak cocok.' });
        return;
      }
      if (newPassword.trim().length < 5) {
        res.status(400).json({ error: 'Kata sandi baru minimal 5 karakter.' });
        return;
      }
      db.admin.password = newPassword.trim();
    }

    if (newName && newName.trim()) {
      db.admin.name = newName.trim();
    }
    if (photoUrl !== undefined) {
      db.admin.photoUrl = photoUrl;
    }

    writeDb(db);
    res.json({ ok: true, state: sanitizeDb(db) });
  });

  app.post('/api/upload', (req, res) => {
    const { dataUrl, filename } = req.body as {
      dataUrl: string;
      filename?: string;
    };
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      res.status(400).json({ error: 'Format file tidak valid.' });
      return;
    }
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'Data base64 tidak terbaca.' });
      return;
    }
    const mime = match[1];
    const base64Data = match[2];
    const extFromName = filename ? path.extname(filename).replace(/[^a-zA-Z0-9.]/g, '') : '';
    let ext = extFromName;
    if (!ext) {
      if (mime.includes('png')) ext = '.png';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
      else if (mime.includes('webp')) ext = '.webp';
      else if (mime.includes('mpeg') || mime.includes('mp3')) ext = '.mp3';
      else if (mime.includes('wav')) ext = '.wav';
      else if (mime.includes('ogg')) ext = '.ogg';
      else if (mime.includes('webm')) ext = '.webm';
      else if (mime.includes('mp4') || mime.includes('m4a')) ext = '.m4a';
      else ext = '.bin';
    }
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    res.json({ url: `/uploads/${safeName}` });
  });

  // Academic Years
  app.post('/api/academic-years', (req, res) => {
    const body = req.body as AcademicYear;
    const db = readDb();
    const id = body.id || `ay-${Date.now()}`;
    if (body.isActive) {
      db.academicYears = db.academicYears.map((y) => ({ ...y, isActive: false }));
    }
    const nextItem: AcademicYear = {
      id,
      label: body.label,
      activeSemester: body.activeSemester || 1,
      isActive: Boolean(body.isActive),
    };
    db.academicYears.unshift(nextItem);
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  app.put('/api/academic-years/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<AcademicYear>;
    const db = readDb();
    if (body.isActive) {
      db.academicYears = db.academicYears.map((y) => ({ ...y, isActive: false }));
    }
    db.academicYears = db.academicYears.map((y) =>
      y.id === id ? { ...y, ...body } : y
    );
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  app.delete('/api/academic-years/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    if (db.academicYears.length <= 1) {
      res.status(400).json({ error: 'Minimal harus ada satu Tahun Ajaran.' });
      return;
    }
    db.academicYears = db.academicYears.filter((y) => y.id !== id);
    if (!db.academicYears.some((y) => y.isActive)) {
      db.academicYears[0].isActive = true;
    }
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  // Materials
  app.post('/api/materials', (req, res) => {
    const body = req.body as TahfidzMaterial;
    const db = readDb();
    const item: TahfidzMaterial = {
      ...body,
      id: body.id || `mat-custom-${Date.now()}`,
      orderIndex: body.orderIndex ?? db.materials.length + 1,
      isCustom: true,
    };
    db.materials.push(item);
    writeDb(db);
    res.json({ state: sanitizeDb(db), item });
  });

  app.put('/api/materials/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<TahfidzMaterial>;
    const db = readDb();
    db.materials = db.materials.map((m) => (m.id === id ? { ...m, ...body } : m));
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  app.delete('/api/materials/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.materials = db.materials.filter((m) => m.id !== id);
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  // Teachers
  app.post('/api/teachers', (req, res) => {
    const body = req.body as TeacherProfile;
    const db = readDb();
    const cleanId = body.loginId.trim().toUpperCase();
    if (db.teachers.some((t) => t.loginId.toUpperCase() === cleanId)) {
      res.status(400).json({ error: `ID Login "${cleanId}" sudah digunakan guru lain.` });
      return;
    }
    const item: TeacherProfile = {
      ...body,
      id: body.id || `tch-${Date.now()}`,
      loginId: cleanId,
    };
    db.teachers.push(item);
    writeDb(db);
    res.json({ state: sanitizeDb(db), item });
  });

  app.put('/api/teachers/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<TeacherProfile>;
    const db = readDb();
    if (body.loginId) {
      const cleanId = body.loginId.trim().toUpperCase();
      if (db.teachers.some((t) => t.id !== id && t.loginId.toUpperCase() === cleanId)) {
        res.status(400).json({ error: `ID Login "${cleanId}" sudah digunakan guru lain.` });
        return;
      }
      body.loginId = cleanId;
    }
    db.teachers = db.teachers.map((t) => (t.id === id ? { ...t, ...body } : t));
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  app.delete('/api/teachers/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.teachers = db.teachers.filter((t) => t.id !== id);
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  // Students
  app.post('/api/students', (req, res) => {
    const body = req.body as StudentProfile;
    const db = readDb();
    const cleanStudentId = body.studentLoginId.trim().toUpperCase();
    const cleanParentId = body.parentLoginId.trim().toUpperCase();
    if (
      db.students.some(
        (s) =>
          s.studentLoginId.toUpperCase() === cleanStudentId ||
          s.parentLoginId.toUpperCase() === cleanParentId
      )
    ) {
      res.status(400).json({ error: 'ID Login Murid atau Orang Tua sudah terdaftar.' });
      return;
    }
    const item: StudentProfile = {
      ...body,
      id: body.id || `std-${Date.now()}`,
      studentLoginId: cleanStudentId,
      parentLoginId: cleanParentId,
    };
    db.students.push(item);
    writeDb(db);
    res.json({ state: sanitizeDb(db), item });
  });

  app.put('/api/students/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<StudentProfile>;
    const db = readDb();
    if (body.studentLoginId) body.studentLoginId = body.studentLoginId.trim().toUpperCase();
    if (body.parentLoginId) body.parentLoginId = body.parentLoginId.trim().toUpperCase();
    db.students = db.students.map((s) => (s.id === id ? { ...s, ...body } : s));
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  app.delete('/api/students/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.students = db.students.filter((s) => s.id !== id);
    db.dailyLogs = db.dailyLogs.filter((d) => d.studentId !== id);
    db.weeklyEvaluations = db.weeklyEvaluations.filter((w) => w.studentId !== id);
    db.monthlyEvaluations = db.monthlyEvaluations.filter((m) => m.studentId !== id);
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  // Daily Logs (Senin - Kamis)
  app.post('/api/daily-logs', (req, res) => {
    const body = req.body as DailyLog;
    const db = readDb();
    const item: DailyLog = {
      ...body,
      id: body.id || `dl-${Date.now()}`,
    };
    db.dailyLogs.unshift(item);
    writeDb(db);
    res.json({ state: sanitizeDb(db), item });
  });

  app.put('/api/daily-logs/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<DailyLog>;
    const db = readDb();
    db.dailyLogs = db.dailyLogs.map((l) => (l.id === id ? { ...l, ...body } : l));
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  app.delete('/api/daily-logs/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.dailyLogs = db.dailyLogs.filter((l) => l.id !== id);
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  // Weekly Evaluations (Jum'at)
  app.post('/api/weekly-evaluations', (req, res) => {
    const body = req.body as WeeklyEvaluation;
    const db = readDb();
    const item: WeeklyEvaluation = {
      ...body,
      id: body.id || `we-${Date.now()}`,
    };
    db.weeklyEvaluations.unshift(item);
    writeDb(db);
    res.json({ state: sanitizeDb(db), item });
  });

  app.put('/api/weekly-evaluations/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<WeeklyEvaluation>;
    const db = readDb();
    db.weeklyEvaluations = db.weeklyEvaluations.map((w) =>
      w.id === id ? { ...w, ...body } : w
    );
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  app.delete('/api/weekly-evaluations/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.weeklyEvaluations = db.weeklyEvaluations.filter((w) => w.id !== id);
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  // Monthly Evaluations
  app.post('/api/monthly-evaluations', (req, res) => {
    const body = req.body as MonthlyEvaluation;
    const db = readDb();
    const item: MonthlyEvaluation = {
      ...body,
      id: body.id || `me-${Date.now()}`,
    };
    db.monthlyEvaluations.unshift(item);
    writeDb(db);
    res.json({ state: sanitizeDb(db), item });
  });

  app.put('/api/monthly-evaluations/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<MonthlyEvaluation>;
    const db = readDb();
    db.monthlyEvaluations = db.monthlyEvaluations.map((m) =>
      m.id === id ? { ...m, ...body } : m
    );
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  app.delete('/api/monthly-evaluations/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.monthlyEvaluations = db.monthlyEvaluations.filter((m) => m.id !== id);
    writeDb(db);
    res.json({ state: sanitizeDb(db) });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
