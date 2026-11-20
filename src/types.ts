export type UserRole =
  | 'ADMIN'
  | 'KEPALA_PROGRAM'
  | 'GURU_PENDAMPING'
  | 'MURID'
  | 'ORANG_TUA';

export type InstitutionType = 'RA' | 'MI';

export type ClassLevel =
  | 'RA A'
  | 'RA B'
  | 'Kelas 1'
  | 'Kelas 2'
  | 'Kelas 3'
  | 'Kelas 4'
  | 'Kelas 5'
  | 'Kelas 6';

export type SemesterNumber = 1 | 2;

export type AssessmentStatus = 'LANCAR' | 'MUROJAAH' | 'BELUM';

export type DailyDay = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis';

export type MaterialCategory = 'JUZ_30' | 'DOA_HARIAN';

export interface AcademicYear {
  id: string;
  label: string; // e.g. "2025/2026"
  activeSemester: SemesterNumber;
  isActive: boolean;
}

export interface AdminAccount {
  loginId: string;
  name: string;
  password: string;
  photoUrl?: string;
}

export interface TeacherProfile {
  id: string;
  loginId: string;
  name: string;
  role: 'KEPALA_PROGRAM' | 'GURU_PENDAMPING';
  nipOrNuptk?: string;
  assignedClasses: ClassLevel[];
  phone?: string;
  photoUrl?: string;
}

export interface StudentProfile {
  id: string;
  studentLoginId: string;
  parentLoginId: string;
  nis?: string;
  name: string;
  parentName: string;
  institution: InstitutionType;
  classLevel: ClassLevel;
  rombel?: string; // e.g., "A", "B", "Unggulan"
  academicYearId: string;
  photoUrl?: string;
}

export interface TahfidzMaterial {
  id: string;
  category: MaterialCategory;
  title: string;
  subtitle?: string; // e.g. "Surah ke-78 · 40 Ayat" or "Doa Harian"
  arabicText: string;
  transliteration?: string;
  translationOrGuide: string;
  targetClasses: ClassLevel[];
  targetSemester: SemesterNumber | 'BOTH';
  ayahCount?: number;
  audioUrl?: string; // URL, /api/uploads/..., or data URL
  orderIndex: number;
  isCustom?: boolean;
}

export interface DailyLog {
  id: string;
  studentId: string;
  teacherId: string;
  academicYearId: string;
  semester: SemesterNumber;
  weekNumber: number; // Pekan ke-1 s.d. 20
  day: DailyDay;
  date: string; // YYYY-MM-DD
  category: MaterialCategory;
  materialId?: string;
  materialTitle: string;
  portionDetail: string; // e.g. "Ayat 1–10 (Setoran Baru)" or "Hafalan Penuh"
  logType: 'SETORAN_BARU' | 'MUROJAAH';
  score: number; // 0-100
  status: AssessmentStatus;
  notes: string;
}

export interface WeeklyEvaluation {
  id: string;
  studentId: string;
  teacherId: string;
  academicYearId: string;
  semester: SemesterNumber;
  weekNumber: number;
  fridayDate: string; // YYYY-MM-DD (Jum'at)
  summaryMaterial: string;
  fluencyScore: number; // Kelancaran 0-100
  tajwidOrAdabScore: number; // Tajwid / Adab 0-100
  finalScore: number;
  status: AssessmentStatus;
  teacherNotes: string;
}

export type EvaluationPredicate =
  | 'A+ (Amat Sangat Baik)'
  | 'A- (Sangat Baik)'
  | 'B+ (Baik)'
  | 'B- (Cukup Baik)'
  | 'C+ (Cukup)'
  | 'C- (Ulang)';

export const ALL_PREDICATES: EvaluationPredicate[] = [
  'A+ (Amat Sangat Baik)',
  'A- (Sangat Baik)',
  'B+ (Baik)',
  'B- (Cukup Baik)',
  'C+ (Cukup)',
  'C- (Ulang)',
];

export function getPredicateFromScore(score: number): EvaluationPredicate {
  if (score >= 93) return 'A+ (Amat Sangat Baik)';
  if (score >= 88) return 'A- (Sangat Baik)';
  if (score >= 82) return 'B+ (Baik)';
  if (score >= 75) return 'B- (Cukup Baik)';
  if (score >= 68) return 'C+ (Cukup)';
  return 'C- (Ulang)';
}

export interface MonthlyEvaluation {
  id: string;
  studentId: string;
  teacherId: string;
  academicYearId: string;
  semester: SemesterNumber;
  monthIndex: number; // 1-6 within semester
  monthName: string; // e.g., "Juli", "Agustus", ...
  juz30ProgressText: string;
  doaProgressText: string;
  averageScore: number;
  status: AssessmentStatus;
  predicate: EvaluationPredicate;
  summaryNotes: string;
}

export interface AppDatabase {
  admin: AdminAccount;
  academicYears: AcademicYear[];
  teachers: TeacherProfile[];
  students: StudentProfile[];
  materials: TahfidzMaterial[];
  dailyLogs: DailyLog[];
  weeklyEvaluations: WeeklyEvaluation[];
  monthlyEvaluations: MonthlyEvaluation[];
}

export interface AuthSession {
  role: UserRole;
  loginId: string;
  displayName: string;
  photoUrl?: string;
  teacher?: TeacherProfile;
  student?: StudentProfile;
}

export interface Juz30Ayah {
  number: number;
  arabic: string;
  latin: string;
  indonesian: string;
  audioUrl?: string;
}

export interface Juz30SurahDetail {
  surahNo: number;
  arabicName: string;
  latinName: string;
  meaning: string;
  ayahCount: number;
  fullArabicText: string;
  fullTransliteration: string;
  ayahs: Juz30Ayah[];
}

export const ALL_CLASS_LEVELS: ClassLevel[] = [
  'RA A',
  'RA B',
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
];

export const RA_CLASSES: ClassLevel[] = ['RA A', 'RA B'];
export const MI_CLASSES: ClassLevel[] = [
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
];

export const DAILY_DAYS: DailyDay[] = ['Senin', 'Selasa', 'Rabu', 'Kamis'];

export const SEMESTER_1_MONTHS = [
  { index: 1, name: 'Juli' },
  { index: 2, name: 'Agustus' },
  { index: 3, name: 'September' },
  { index: 4, name: 'Oktober' },
  { index: 5, name: 'November' },
  { index: 6, name: 'Desember' },
];

export const SEMESTER_2_MONTHS = [
  { index: 1, name: 'Januari' },
  { index: 2, name: 'Februari' },
  { index: 3, name: 'Maret' },
  { index: 4, name: 'April' },
  { index: 5, name: 'Mei' },
  { index: 6, name: 'Juni' },
];

export const YAYASAN_LOGO_PATH = '/assets/aistudio/1000435209_80ac9f58.png';
