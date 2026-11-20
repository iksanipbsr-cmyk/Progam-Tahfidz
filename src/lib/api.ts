import {
  AcademicYear,
  AuthSession,
  DailyLog,
  MonthlyEvaluation,
  StudentProfile,
  TahfidzMaterial,
  TeacherProfile,
  WeeklyEvaluation,
} from '../types';

export interface ClientAppState {
  adminProfile: {
    loginId: string;
    name: string;
    photoUrl?: string;
  };
  academicYears: AcademicYear[];
  teachers: TeacherProfile[];
  students: StudentProfile[];
  materials: TahfidzMaterial[];
  dailyLogs: DailyLog[];
  weeklyEvaluations: WeeklyEvaluation[];
  monthlyEvaluations: MonthlyEvaluation[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada server.');
  }
  return data as T;
}

export const api = {
  getState: () => request<ClientAppState>('/api/state'),

  login: (payload: {
    mode: 'ADMIN' | 'TEACHER' | 'FAMILY';
    loginId: string;
    password?: string;
  }) =>
    request<{ session: AuthSession }>('/api/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminAccount: (payload: {
    currentPassword?: string;
    newPassword?: string;
    newName?: string;
    photoUrl?: string;
  }) =>
    request<{ ok: boolean; state: ClientAppState }>('/api/admin/password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uploadFile: (dataUrl: string, filename?: string) =>
    request<{ url: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, filename }),
    }),

  // Academic Years
  createAcademicYear: (data: Omit<AcademicYear, 'id'>) =>
    request<{ state: ClientAppState }>('/api/academic-years', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAcademicYear: (id: string, data: Partial<AcademicYear>) =>
    request<{ state: ClientAppState }>(`/api/academic-years/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAcademicYear: (id: string) =>
    request<{ state: ClientAppState }>(`/api/academic-years/${id}`, {
      method: 'DELETE',
    }),

  // Materials
  createMaterial: (data: Omit<TahfidzMaterial, 'id'>) =>
    request<{ state: ClientAppState; item: TahfidzMaterial }>('/api/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMaterial: (id: string, data: Partial<TahfidzMaterial>) =>
    request<{ state: ClientAppState }>(`/api/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMaterial: (id: string) =>
    request<{ state: ClientAppState }>(`/api/materials/${id}`, {
      method: 'DELETE',
    }),

  // Teachers
  createTeacher: (data: Omit<TeacherProfile, 'id'>) =>
    request<{ state: ClientAppState; item: TeacherProfile }>('/api/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTeacher: (id: string, data: Partial<TeacherProfile>) =>
    request<{ state: ClientAppState }>(`/api/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTeacher: (id: string) =>
    request<{ state: ClientAppState }>(`/api/teachers/${id}`, {
      method: 'DELETE',
    }),

  // Students
  createStudent: (data: Omit<StudentProfile, 'id'>) =>
    request<{ state: ClientAppState; item: StudentProfile }>('/api/students', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStudent: (id: string, data: Partial<StudentProfile>) =>
    request<{ state: ClientAppState }>(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteStudent: (id: string) =>
    request<{ state: ClientAppState }>(`/api/students/${id}`, {
      method: 'DELETE',
    }),

  // Daily Logs
  createDailyLog: (data: Omit<DailyLog, 'id'>) =>
    request<{ state: ClientAppState; item: DailyLog }>('/api/daily-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDailyLog: (id: string, data: Partial<DailyLog>) =>
    request<{ state: ClientAppState }>(`/api/daily-logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteDailyLog: (id: string) =>
    request<{ state: ClientAppState }>(`/api/daily-logs/${id}`, {
      method: 'DELETE',
    }),

  // Weekly Evaluations
  createWeeklyEval: (data: Omit<WeeklyEvaluation, 'id'>) =>
    request<{ state: ClientAppState; item: WeeklyEvaluation }>('/api/weekly-evaluations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateWeeklyEval: (id: string, data: Partial<WeeklyEvaluation>) =>
    request<{ state: ClientAppState }>(`/api/weekly-evaluations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteWeeklyEval: (id: string) =>
    request<{ state: ClientAppState }>(`/api/weekly-evaluations/${id}`, {
      method: 'DELETE',
    }),

  // Monthly Evaluations
  createMonthlyEval: (data: Omit<MonthlyEvaluation, 'id'>) =>
    request<{ state: ClientAppState; item: MonthlyEvaluation }>('/api/monthly-evaluations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMonthlyEval: (id: string, data: Partial<MonthlyEvaluation>) =>
    request<{ state: ClientAppState }>(`/api/monthly-evaluations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMonthlyEval: (id: string) =>
    request<{ state: ClientAppState }>(`/api/monthly-evaluations/${id}`, {
      method: 'DELETE',
    }),

  getJuz30Surah: (surahNo: number) =>
    request<{ surah: import('../types').Juz30SurahDetail }>(`/api/juz30/${surahNo}`),

  syncJuz30: () =>
    request<{ state: ClientAppState }>('/api/juz30/sync', {
      method: 'POST',
    }),
};

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}
