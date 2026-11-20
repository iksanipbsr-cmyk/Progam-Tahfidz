import React from 'react';
import { CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import { AssessmentStatus, YAYASAN_LOGO_PATH } from '../types';

export function StatusIndicator({ status }: { status: AssessmentStatus }) {
  if (status === 'LANCAR') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Lancar / Tuntas</span>
      </span>
    );
  }
  if (status === 'MUROJAAH') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D97706] whitespace-nowrap">
        <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Perlu Murojaah</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626] whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Belum / Mengulang</span>
    </span>
  );
}

export function AvatarThumb({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [imgError, setImgError] = React.useState(false);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const dims =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
        ? 'w-14 h-14 text-base'
        : size === 'xl'
          ? 'w-20 h-20 text-xl'
          : 'w-10 h-10 text-sm';

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${dims} rounded-lg object-cover border border-[#1B7A2B]/20 bg-[#F8FAF5] shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-lg bg-[#1B7A2B]/10 text-[#1B7A2B] border border-[#1B7A2B]/20 font-semibold flex items-center justify-center shrink-0 select-none`}
      aria-label={name}
    >
      {initials || 'AM'}
    </div>
  );
}

export function OfficialKopHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="border-b-[3px] border-double border-[#1A1D1A] pb-3">
        <div className="flex items-center gap-4">
          <img
            src={YAYASAN_LOGO_PATH}
            alt="Logo Yayasan Miftahul Huda Al-Ma'ruf"
            referrerPolicy="no-referrer"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0"
          />
          <div className="flex-1 text-center">
            <p className="text-sm sm:text-base font-bold tracking-wide text-[#1B7A2B]">
              YAYASAN MIFTAHUL HUDA AL MA’RUF
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-[#1A1D1A]">
              AKTA NOTARIS NO. 52 MOCH. FARCHAN ALI IMRON TANGGAL 08 MEI 2015
            </p>
            <h2 className="text-base sm:text-xl font-bold text-[#1A1D1A] mt-0.5 tracking-tight">
              RA &amp; MI UNGGULAN AL MA&apos;RUF
            </h2>
            <p className="text-[11px] sm:text-xs font-medium text-[#1A1D1A] font-mono-tabular">
              NIM : 111233150109 &nbsp; NPSN : 70026119
            </p>
            <p className="text-[10px] sm:text-[11px] text-[#404740] leading-snug mt-0.5">
              Dusun Sumberjo Rt. 004 Rw. 006 Desa Mayahan Kec. Tawangharjo Kab. Grobogan, Prov. Jawatengah, 58191, No Telp. 081386292899. Email. Miunggulanalmarufmayahan1@gmail.com
            </p>
          </div>
        </div>
      </div>
      {subtitle && (
        <p className="text-center text-xs sm:text-sm font-bold text-[#1B7A2B] tracking-wide mt-3">
          {subtitle}
        </p>
      )}
    </div>
  );
}
